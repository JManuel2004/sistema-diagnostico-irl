import type { MaturityProfileResponse } from '@innlab/contracts';
import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import type { SubmitQuestionnaireUseCase } from './submit-questionnaire.use-case.js';
import { type AnswerSheetRepositoryPort } from '../../domain/repositories/answer-sheet.repository.port.js';
import type { ComputeMaturityProfileUseCase } from './compute-maturity-profile.use-case.js';
import { type TaxonomyRepositoryPort } from '../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import { toMaturityProfileResponse } from '../dtos/map-maturity-profile-response.js';
import type { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';
import type { InvariantViolationError } from '../../../../shared/kernel/domain/errors/invariant-violation.error.js';
import { MaturityProfileCalculationError } from '../../domain/exceptions/maturity-profile-calculation.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import { findOwnDiagnosis } from './find-own-diagnosis.js';

export interface FinalizeInitialDiagnosticCommand {
  diagnosticId: string;
  /** The caller: someone else's diagnostic is answered as missing. */
  userId: string;
  answers: { statementId: string; value: number; justification: string }[];
}

/**
 * The diagnostic not existing, being in the wrong state to finalize, or
 * the questionnaire submission being incomplete are all normal, expected
 * outcomes of this orchestration — not exceptional conditions — so they
 * come back as `Result.err`. `MaturityProfileCalculationError` is deliberately NOT
 * part of that: a missing answer sheet at this point, or `ComputeMaturity
 * ProfileUseCase` itself failing, are system defects (this method already
 * validated the questionnaire was submitted), not business outcomes, and
 * stay thrown exceptions the same as before this adoption.
 */
export class FinalizeInitialDiagnosisUseCase {
  constructor(
    private readonly diagnostics: DiagnosisRepositoryPort,
    private readonly answerSheets: AnswerSheetRepositoryPort,
    private readonly submitQuestionnaire: SubmitQuestionnaireUseCase,
    private readonly computeProfile: ComputeMaturityProfileUseCase,
    private readonly taxonomy: TaxonomyRepositoryPort,
  ) {}

  async execute(
    cmd: FinalizeInitialDiagnosticCommand,
  ): Promise<
    Result<
      MaturityProfileResponse,
      NotFoundError | ConflictError | InvariantViolationError
    >
  > {
    const own = await findOwnDiagnosis(this.diagnostics, cmd.diagnosticId, cmd.userId);
    if (!own.ok) return own;
    const diagnosis = own.value;

    // Once the profile exists the answers are frozen: processing again would
    // leave the stored recommendation and roadmap computed from other answers.
    const current = diagnosis.state.value;
    if (!diagnosis.acceptsAnswers) {
      return Result.err(
        new ConflictError(
          `Diagnosis cannot be finalized from state ${current}`,
          {
            diagnosticId: cmd.diagnosticId,
            state: current,
          },
        ),
      );
    }

    const submission = await this.submitQuestionnaire.execute({
      diagnosticId: cmd.diagnosticId,
      userId: cmd.userId,
      answers: cmd.answers,
    });
    if (!submission.ok) {
      return Result.err(submission.error);
    }

    const sheet = await this.answerSheets.findByDiagnosticId(cmd.diagnosticId);
    if (!sheet) {
      throw new MaturityProfileCalculationError(
        `No answer sheet found for diagnostic ${cmd.diagnosticId}`,
        { diagnosticId: cmd.diagnosticId },
      );
    }

    const { profile, imbalances } = await this.computeProfile.execute({
      diagnosticId: cmd.diagnosticId,
      frameworkVersionId: diagnosis.frameworkVersionId,
      answers: sheet.answers().map((a) => ({
        statementId: a.statementId,
        value: a.value.value,
      })),
    });

    if (diagnosis.state.canTransitionTo('QUESTIONNAIRE_IN_PROGRESS')) {
      diagnosis.transitionTo('QUESTIONNAIRE_IN_PROGRESS');
    }
    if (diagnosis.state.canTransitionTo('QUESTIONNAIRE_COMPLETE')) {
      diagnosis.transitionTo('QUESTIONNAIRE_COMPLETE');
    }
    if (diagnosis.state.canTransitionTo('PROFILE_GENERATED')) {
      diagnosis.transitionTo('PROFILE_GENERATED');
    }

    await this.diagnostics.save(diagnosis);

    const dimensions = await this.taxonomy.findAllDimensions();
    return Result.ok(
      toMaturityProfileResponse(profile, imbalances, dimensions),
    );
  }
}
