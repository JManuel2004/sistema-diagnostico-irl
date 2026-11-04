import type { QuestionnaireDraft } from '../entities/questionnaire-draft.aggregate.js';

/**
 * Repository port for the questionnaire draft of a diagnostic.
 *
 * At most one draft per diagnostic; it goes with the diagnostic when this is
 * deleted (`ON DELETE CASCADE`).
 */
export const QUESTIONNAIRE_DRAFT_REPOSITORY = Symbol(
  'QUESTIONNAIRE_DRAFT_REPOSITORY',
);

export interface QuestionnaireDraftRepositoryPort {
  /** The saved draft, or an empty one when nothing was saved. */
  findByDiagnosticId(diagnosticId: string): Promise<QuestionnaireDraft>;
  /** Replaces the whole draft in one transaction and returns it as saved. */
  replace(draft: QuestionnaireDraft): Promise<QuestionnaireDraft>;
  deleteByDiagnosticId(diagnosticId: string): Promise<void>;
}
