import type { SubmitQuestionnaireResponse } from '@innlab/contracts';
import { type AnswerSheetRepositoryPort } from '../../domain/repositories/answer-sheet.repository.port.js';
import { AnswerSheet } from '../../domain/entities/answer-sheet.aggregate.js';
import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { LikertValue } from '../../../../shared/kernel/domain/value-objects/likert-value.vo.js';
import { InvariantViolationError } from '../../../../shared/kernel/domain/errors/invariant-violation.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import type { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import { findOwnDiagnosis } from './find-own-diagnosis.js';
import { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';
import { type StatementCatalogPort } from '../../domain/repositories/statement-catalog.port.js';

export interface SubmitQuestionnaireCommand {
  diagnosticId: string;
  /** The caller: someone else's diagnostic is answered as missing. */
  userId: string;
  answers: { statementId: string; value: number; justification: string }[];
}

/**
 * An incomplete submission (not exactly 48 answers) is a normal, expected
 * outcome of this use case — a user can submit early, or a client bug can
 * drop an answer — not an exceptional condition, so it comes back as
 * `Result.err` instead of a thrown exception.
 *
 * The answers must be to the statements of the diagnostic's framework
 * version, and they are frozen once the maturity profile exists (409).
 */
export class SubmitQuestionnaireUseCase {
  constructor(
    private readonly repo: AnswerSheetRepositoryPort,
    private readonly diagnoses: DiagnosisRepositoryPort,
    private readonly statementCatalog: StatementCatalogPort,
  ) {}

  async execute(
    cmd: SubmitQuestionnaireCommand,
  ): Promise<
    Result<
      SubmitQuestionnaireResponse,
      NotFoundError | ConflictError | InvariantViolationError
    >
  > {
    const own = await findOwnDiagnosis(this.diagnoses, cmd.diagnosticId, cmd.userId);
    if (!own.ok) return own;
    const diagnosis = own.value;

    if (!diagnosis.acceptsAnswers) {
      return Result.err(
        new ConflictError(`Answers cannot change in state ${diagnosis.state.value}`, {
          diagnosticId: cmd.diagnosticId,
          state: diagnosis.state.value,
        }),
      );
    }

    const statements = await this.statementCatalog.findStatements(diagnosis.frameworkVersionId);
    const known = new Set(statements.map((s) => s.id));
    const foreign = cmd.answers.find((a) => !known.has(a.statementId));
    if (foreign) {
      return Result.err(
        new InvariantViolationError(
          `Statement ${foreign.statementId} is not part of the diagnostic's questionnaire`,
          { statementId: foreign.statementId },
        ),
      );
    }

    const diagnosticId = Uuid.create(cmd.diagnosticId);
    const sheet = AnswerSheet.create(diagnosticId);

    for (const item of cmd.answers) {
      sheet.setAnswer(
        item.statementId,
        LikertValue.create(item.value),
        item.justification,
      );
    }

    if (sheet.answeredCount !== 48) {
      return Result.err(
        new InvariantViolationError(
          `Cannot submit questionnaire: expected 48 answers, received ${sheet.answeredCount}`,
          {
            diagnosticId: diagnosticId.value,
            answeredCount: sheet.answeredCount,
          },
        ),
      );
    }

    await this.repo.save(sheet);

    return Result.ok({
      diagnosticId: diagnosticId.value,
      answersRecorded: sheet.answeredCount,
      state: 'QUESTIONNAIRE_COMPLETE',
    });
  }
}
