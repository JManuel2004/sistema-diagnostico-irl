import type { QuestionnaireDraft as QuestionnaireDraftResponse } from '@innlab/contracts';
import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import { type QuestionnaireDraftRepositoryPort } from '../../domain/repositories/questionnaire-draft.repository.port.js';
import { type StatementCatalogPort } from '../../domain/repositories/statement-catalog.port.js';
import { QuestionnaireDraft } from '../../domain/entities/questionnaire-draft.aggregate.js';
import { toQuestionnaireDraftResponse } from '../dtos/map-questionnaire-draft-response.js';
import { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';
import { InvariantViolationError } from '../../../../shared/kernel/domain/errors/invariant-violation.error.js';
import type { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import { findOwnDiagnosis } from './find-own-diagnosis.js';

export interface SaveQuestionnaireDraftCommand {
  diagnosticId: string;
  /** The caller: someone else's diagnostic is answered as missing. */
  userId: string;
  entries: {
    statementId: string;
    value: number | null;
    justification: string | null;
  }[];
}

/**
 * Saves what the user has answered so far, replacing the previous draft.
 *
 * The wizard calls it automatically while the user answers, so the progress
 * survives closing the session. Only while the answers can still change
 * (409 once the profile exists), and only with statements of the
 * diagnostic's framework version (422). The first save marks the
 * questionnaire as started (`QUESTIONNAIRE_IN_PROGRESS`).
 */
export class SaveQuestionnaireDraftUseCase {
  constructor(
    private readonly diagnoses: DiagnosisRepositoryPort,
    private readonly drafts: QuestionnaireDraftRepositoryPort,
    private readonly statementCatalog: StatementCatalogPort,
  ) {}

  async execute(
    cmd: SaveQuestionnaireDraftCommand,
  ): Promise<
    Result<
      QuestionnaireDraftResponse,
      NotFoundError | ConflictError | InvariantViolationError
    >
  > {
    const own = await findOwnDiagnosis(
      this.diagnoses,
      cmd.diagnosticId,
      cmd.userId,
    );
    if (!own.ok) return own;
    const diagnosis = own.value;

    if (!diagnosis.acceptsAnswers) {
      return Result.err(
        new ConflictError(
          `The draft cannot change in state ${diagnosis.state.value}`,
          {
            diagnosticId: cmd.diagnosticId,
            state: diagnosis.state.value,
          },
        ),
      );
    }

    const statements = await this.statementCatalog.findStatements(
      diagnosis.frameworkVersionId,
    );
    const known = new Set(statements.map((s) => s.id));
    const foreign = cmd.entries.find((e) => !known.has(e.statementId));
    if (foreign) {
      return Result.err(
        new InvariantViolationError(
          `Statement ${foreign.statementId} is not part of the diagnostic's questionnaire`,
          { statementId: foreign.statementId },
        ),
      );
    }

    const saved = await this.drafts.replace(
      QuestionnaireDraft.from(cmd.diagnosticId, cmd.entries),
    );

    if (diagnosis.state.canTransitionTo('QUESTIONNAIRE_IN_PROGRESS')) {
      diagnosis.transitionTo('QUESTIONNAIRE_IN_PROGRESS');
      await this.diagnoses.save(diagnosis);
    }

    return Result.ok(toQuestionnaireDraftResponse(saved));
  }
}
