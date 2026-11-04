import { getParsed, putParsed } from '@/shared/api/http';
import {
  questionnaireDraftSchema,
  type DraftEntry,
  type QuestionnaireDraft,
} from '@innlab/contracts';

/** The draft saved on the server; empty (`updatedAt: null`) when none. */
export function getQuestionnaireDraft(diagnosticId: string): Promise<QuestionnaireDraft> {
  return getParsed(`/diagnostics/${diagnosticId}/questionnaire/draft`, questionnaireDraftSchema);
}

/** Replaces the draft saved on the server with `entries`. */
export function saveQuestionnaireDraft(
  diagnosticId: string,
  entries: readonly DraftEntry[],
): Promise<QuestionnaireDraft> {
  return putParsed(
    `/diagnostics/${diagnosticId}/questionnaire/draft`,
    { entries },
    questionnaireDraftSchema,
  );
}
