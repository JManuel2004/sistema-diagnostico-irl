import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DimensionCode, LikertValue } from '@innlab/contracts';

/**
 * Draft of the IRL questionnaire (HU-09).
 *
 * Owns four slices of cross-component state that must survive
 * dimension-tab navigation, route navigation within the SPA, and a
 * page reload (F5):
 *
 *   1. `answers`  — statementId → Likert 1..5
 *   2. `justifications` — statementId → why the user chose that level
 *      (optional; a statement is complete with its answer alone)
 *   3. `activeTab` — currently selected dimension code
 *   4. `diagnosticId` — guards against cross-diagnostic contamination
 *
 * Persistence: `sessionStorage` (see `STATE_MANAGEMENT.md` §"Zustand") for
 * `F5`, and **the server** for everything else: `useServerDraftSync` saves
 * the draft while the user answers and brings it back in a later session or
 * on another device. `unsynced` and `syncedAt` say what the server already
 * has; `revision` counts local changes so a save that raced with a newer
 * change does not mark the draft as saved.
 *
 * Re-renders are minimised by selector-based subscriptions; consumers
 * must always read individual slices, never the whole store.
 */
interface State {
  diagnosticId: string | null;
  answers: Record<string, LikertValue>;
  justifications: Record<string, string>;
  activeTab: DimensionCode;
  dirty: boolean;
  /** Local changes the server does not have yet. */
  unsynced: boolean;
  /** `updatedAt` of the server draft this one matches; null if none. */
  syncedAt: string | null;
  /** Number of local changes in this tab; not persisted. */
  revision: number;
}

interface Actions {
  /**
   * Idempotent. If called with the same `diagnosticId` already in
   * state, it's a no-op; if called with a different id, the store is
   * wiped clean before the new id is set. This is what prevents one
   * user's diagnostic-A draft from leaking into diagnostic-B in the
   * same tab (AC-5).
   */
  initialize: (diagnosticId?: string | null) => void;
  setAnswer: (statementId: string, value: LikertValue) => void;
  setJustification: (statementId: string, text: string) => void;
  /** Replaces answers and justifications at once (development autofill). */
  fill: (answers: Record<string, LikertValue>, justifications: Record<string, string>) => void;
  setActiveTab: (tab: DimensionCode) => void;
  /** Replaces the draft with the one saved on the server. */
  hydrate: (
    answers: Record<string, LikertValue>,
    justifications: Record<string, string>,
    syncedAt: string,
  ) => void;
  /**
   * The server saved the draft as it was at `revision`. Only when nothing
   * changed since is it marked as synced.
   */
  markSynced: (syncedAt: string | null, revision: number) => void;
  /** Wipes only the per-diagnostic data; keeps the diagnosticId. */
  reset: () => void;
  /** Wipes everything including the diagnosticId. */
  clear: () => void;
}

type DraftStore = State & Actions;

const DRAFT_STORAGE_KEY = 'innlab.questionnaire-draft.v1';

const INITIAL_STATE: State = {
  diagnosticId: null,
  answers: {},
  justifications: {},
  activeTab: 'TRL',
  dirty: false,
  unsynced: false,
  syncedAt: null,
  revision: 0,
};

export const useQuestionnaireDraftStore = create<DraftStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,
      initialize(diagnosticId?: string | null) {
        const current = get().diagnosticId;
        const next = diagnosticId ?? null;
        // Same id (including both null) — nothing to do.
        if (next === current) return;
        // Different id — wipe per-diagnostic state, keep no leaked answers.
        set({ ...INITIAL_STATE, diagnosticId: next });
      },
      setAnswer(statementId: string, value: LikertValue) {
        set((s) => ({
          answers: { ...s.answers, [statementId]: value },
          dirty: true,
          unsynced: true,
          revision: s.revision + 1,
        }));
      },
      setJustification(statementId: string, text: string) {
        set((s) => ({
          justifications: { ...s.justifications, [statementId]: text },
          dirty: true,
          unsynced: true,
          revision: s.revision + 1,
        }));
      },
      fill(answers: Record<string, LikertValue>, justifications: Record<string, string>) {
        set((s) => ({
          answers,
          justifications,
          dirty: true,
          unsynced: true,
          revision: s.revision + 1,
        }));
      },
      hydrate(
        answers: Record<string, LikertValue>,
        justifications: Record<string, string>,
        syncedAt: string,
      ) {
        set({ answers, justifications, unsynced: false, syncedAt });
      },
      markSynced(syncedAt: string | null, revision: number) {
        set((s) => (s.revision === revision ? { unsynced: false, syncedAt } : { syncedAt }));
      },
      setActiveTab(activeTab: DimensionCode) {
        set({ activeTab });
      },
      reset() {
        set((s) => ({ ...INITIAL_STATE, diagnosticId: s.diagnosticId }));
      },
      clear() {
        set(INITIAL_STATE);
      },
    }),
    {
      name: DRAFT_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      // v2 added `justifications`; v3, what the server has (`unsynced`,
      // `syncedAt`). An older draft is pushed to the server as unsynced.
      version: 3,
      migrate: (persisted) => ({
        justifications: {},
        unsynced: true,
        syncedAt: null,
        ...(persisted as object),
      }),
      // `dirty` is derived (any answer makes it true on next mutation),
      // so we intentionally exclude it from persistence per
      // SPEC-STORY3 §5.3 / Definition of Done §7.6.
      partialize: (s) => ({
        diagnosticId: s.diagnosticId,
        answers: s.answers,
        justifications: s.justifications,
        activeTab: s.activeTab,
        unsynced: s.unsynced,
        syncedAt: s.syncedAt,
      }),
    },
  ),
);

// Stable selectors — defined at module scope so Zustand can rely on
// referential identity to skip re-renders.
export const selectDraftDiagnosticId = (s: DraftStore) => s.diagnosticId;
export const selectAnswers = (s: DraftStore) => s.answers;
export const selectJustifications = (s: DraftStore) => s.justifications;
export const selectSetJustification = (s: DraftStore) => s.setJustification;
export const selectFill = (s: DraftStore) => s.fill;
export const selectClearDraft = (s: DraftStore) => s.clear;
export const selectJustificationById = (id: string) => (s: DraftStore) =>
  s.justifications[id] ?? '';

/**
 * A statement is complete when it has its Likert answer. The justification
 * is optional: it travels with the answer when the user wrote one.
 */
export function isStatementComplete(
  answers: Record<string, LikertValue>,
  statementId: string,
): boolean {
  return answers[statementId] !== undefined;
}
export const selectSetAnswer = (s: DraftStore) => s.setAnswer;
export const selectActiveTab = (s: DraftStore) => s.activeTab;
export const selectSetActiveTab = (s: DraftStore) => s.setActiveTab;
export const selectInitialize = (s: DraftStore) => s.initialize;
export const selectAnswerById = (id: string) => (s: DraftStore) => s.answers[id] ?? null;
