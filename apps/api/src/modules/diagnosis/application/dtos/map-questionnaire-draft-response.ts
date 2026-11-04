import type { QuestionnaireDraft as QuestionnaireDraftResponse } from '@innlab/contracts';
import type { QuestionnaireDraft } from '../../domain/entities/questionnaire-draft.aggregate.js';

export function toQuestionnaireDraftResponse(
  draft: QuestionnaireDraft,
): QuestionnaireDraftResponse {
  return {
    diagnosticId: draft.diagnosticId,
    entries: draft.entries().map((e) => ({
      statementId: e.statementId,
      value: e.value,
      justification: e.justification,
    })),
    updatedAt: draft.updatedAt?.toISOString() ?? null,
  };
}
