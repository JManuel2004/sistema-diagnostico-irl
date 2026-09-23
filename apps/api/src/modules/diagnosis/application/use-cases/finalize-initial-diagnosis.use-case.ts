import type { MaturityProfileResponse } from '@innlab/contracts';
import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import type { DiagnosisStateName } from '../../domain/value-objects/diagnosis-state.vo.js';
import type { SubmitQuestionnaireUseCase } from './submit-questionnaire.use-case.js';
import { type AnswerSheetRepositoryPort } from '../../domain/repositories/answer-sheet.repository.port.js';
import type { ComputeMaturityProfileUseCase } from './compute-maturity-profile.use-case.js';
import { type TaxonomyRepositoryPort } from '../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import { toMaturityProfileResponse } from '../dtos/map-maturity-profile-response.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';
import type { InvariantViolationError } from '../../../../shared/kernel/domain/errors/invariant-violation.error.js';
import { MaturityProfileCalculationError } from '../../domain/exceptions/maturity-profile-calculation.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

const FINALIZABLE_STATES: readonly DiagnosisStateName[] = [
  'WITH_INITIATIVE',
  'QUESTIONNAIRE_IN_PROGRESS',
  'QUESTIONNAIRE_COMPLETE',
  'PROFILE_GENERATED',
  'DEEP_ANALYSIS_DECLINED',
  'DEEP_ANALYSIS_IN_PROGRESS',
  'DEEP_ANALYSIS_COMPLETE',
];

export interface FinalizeInitialDiagnosticCommand {
  diagnosticId: string;
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
    const diagnosis = await this.diagnostics.findById(cmd.diagnosticId);
    if (!diagnosis) {
      return Result.err(new NotFoundError('Diagnosis', cmd.diagnosticId));
    }

    const current = diagnosis.state.value;
    if (!FINALIZABLE_STATES.includes(current)) {
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
