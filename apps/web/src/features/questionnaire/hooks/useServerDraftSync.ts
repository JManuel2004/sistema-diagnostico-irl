import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { DraftEntry, LikertValue } from '@innlab/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { isApiErrorWithStatus } from '@/shared/api/http';
import { getQuestionnaireDraft, saveQuestionnaireDraft } from '../api/questionnaire-draft.api';
import { useQuestionnaireDraftStore } from '../store/questionnaire-draft.store';

/** Wait after the last change before saving: one request per pause, not per click. */
export const DRAFT_SAVE_DELAY_MS = 1000;
/** Wait before trying again after a failed save. */
export const DRAFT_RETRY_DELAY_MS = 5000;

export type DraftSaveStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'saved'; readonly at: string }
  | { readonly kind: 'error' };

export interface ServerDraftSync {
  /** The saved draft was read (or could not be, and the local one is used). */
  readonly ready: boolean;
  readonly status: DraftSaveStatus;
}

function entriesOf(
  answers: Record<string, LikertValue>,
  justifications: Record<string, string>,
): DraftEntry[] {
  const ids = new Set([...Object.keys(answers), ...Object.keys(justifications)]);
  return [...ids].map((statementId) => {
    const text = justifications[statementId]?.trim() ?? '';
    return {
      statementId,
      value: answers[statementId] ?? null,
      justification: text === '' ? null : text,
    };
  });
}

/**
 * Keeps the questionnaire draft on the server, so closing the session loses
 * nothing and answering resumes on any device.
 *
 *  - **Reading:** once, when the wizard opens the diagnostic. The server's
 *    draft replaces the tab's when it is newer than what the tab last saved
 *    and the tab has no unsaved change of its own; otherwise the tab's wins
 *    and is saved.
 *  - **Saving:** a second after the user stops changing answers, and when the
 *    tab is hidden or the wizard closes. A failure is retried; the tab keeps
 *    the draft meanwhile. Once the answers are processed the server refuses
 *    the draft (409) and saving stops.
 *
 * `enabled` is false until the diagnostic has its initiative: before that
 * there is no questionnaire to save.
 */
export function useServerDraftSync(diagnosticId: string, enabled: boolean): ServerDraftSync {
  const [status, setStatus] = useState<DraftSaveStatus>({ kind: 'idle' });

  const saved = useQuery({
    queryKey: queryKeys.diagnostic.draft(diagnosticId),
    queryFn: () => getQuestionnaireDraft(diagnosticId),
    enabled,
    staleTime: Infinity,
    gcTime: 0,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const ready = !enabled || saved.isSuccess || saved.isError;

  // Bring the server's draft in when it is the newest one.
  useEffect(() => {
    const server = saved.data;
    const serverUpdatedAt = server?.updatedAt ?? null;
    if (server === undefined || serverUpdatedAt === null) return;
    const local = useQuestionnaireDraftStore.getState();
    if (local.diagnosticId !== diagnosticId || local.unsynced) return;
    if (local.syncedAt !== null && local.syncedAt >= serverUpdatedAt) return;

    const answers: Record<string, LikertValue> = {};
    const justifications: Record<string, string> = {};
    for (const entry of server.entries) {
      if (entry.value !== null) answers[entry.statementId] = entry.value;
      if (entry.justification !== null) justifications[entry.statementId] = entry.justification;
    }
    local.hydrate(answers, justifications, serverUpdatedAt);
  }, [saved.data, diagnosticId]);

  // Save every change, a moment after the user stops.
  useEffect(() => {
    if (!enabled || !ready) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;
    let closed = false;

    const schedule = (delay: number): void => {
      clearTimeout(timer);
      timer = setTimeout(() => void flush(), delay);
    };

    async function flush(): Promise<void> {
      const draft = useQuestionnaireDraftStore.getState();
      if (closed || draft.diagnosticId !== diagnosticId || !draft.unsynced) return;
      if (inFlight) {
        schedule(DRAFT_SAVE_DELAY_MS);
        return;
      }
      inFlight = true;
      const revision = draft.revision;
      setStatus({ kind: 'saving' });
      try {
        const result = await saveQuestionnaireDraft(
          diagnosticId,
          entriesOf(draft.answers, draft.justifications),
        );
        useQuestionnaireDraftStore.getState().markSynced(result.updatedAt, revision);
        setStatus(
          result.updatedAt === null ? { kind: 'idle' } : { kind: 'saved', at: result.updatedAt },
        );
      } catch (error) {
        if (isApiErrorWithStatus(error, 409)) {
          // The answers were processed: the draft is no longer needed.
          closed = true;
          setStatus({ kind: 'idle' });
          return;
        }
        setStatus({ kind: 'error' });
        schedule(DRAFT_RETRY_DELAY_MS);
      } finally {
        inFlight = false;
      }
    }

    const unsubscribe = useQuestionnaireDraftStore.subscribe((state, previous) => {
      if (state.revision !== previous.revision) schedule(DRAFT_SAVE_DELAY_MS);
    });
    const onHide = (): void => {
      if (document.visibilityState === 'hidden') void flush();
    };
    document.addEventListener('visibilitychange', onHide);

    // A change the server has not got yet (a reload, a failed save) goes now.
    if (useQuestionnaireDraftStore.getState().unsynced) schedule(0);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onHide);
      clearTimeout(timer);
      void flush();
      closed = true;
    };
  }, [diagnosticId, enabled, ready]);

  return { ready, status };
}

/**
 * How many statements the draft saved on the server has answered, for the
 * panel's «continue» offer. `undefined` while it loads or if it fails.
 */
export function useSavedDraftProgress(diagnosticId: string | undefined): number | undefined {
  const saved = useQuery({
    queryKey: queryKeys.diagnostic.draft(diagnosticId ?? ''),
    queryFn: () => getQuestionnaireDraft(diagnosticId ?? ''),
    enabled: diagnosticId !== undefined,
    staleTime: 0,
  });
  return saved.data?.entries.filter((e) => e.value !== null).length;
}
