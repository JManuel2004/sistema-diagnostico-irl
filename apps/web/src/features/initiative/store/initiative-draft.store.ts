import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { InitiativeProfileFields } from '../lib/form-values';

/**
 * Draft of step 1 while the consent is not accepted.
 *
 * The wizard asks for the initiative before the consent, but the system
 * stores no data of the initiative until the data processing is accepted
 * (RF-03, RNF-06). Between steps 1 and 2 the chosen initiative and the
 * profile form live here, in the browser, and are sent to the backend on
 * acceptance. It is interface draft state (Zustand), not server state.
 *
 * `initiativeId` is the existing initiative the user chose, or `null` for a
 * new one. Once step 2 creates the new initiative it stores its id here, so
 * a retry after a failed profile registration does not create another.
 *
 * It persists in `sessionStorage`, like the questionnaire draft: it
 * survives an F5 and dies with the tab. It is emptied as soon as the
 * profile is registered.
 */
export interface InitiativeDraft {
  readonly initiativeId: string | null;
  readonly command: InitiativeProfileFields;
}

interface State {
  diagnosticId: string | null;
  draft: InitiativeDraft | null;
}

interface Actions {
  /** Switching diagnostic discards the previous one's draft. */
  initialize: (diagnosticId: string | null) => void;
  save: (draft: InitiativeDraft) => void;
  clear: () => void;
}

type DraftStore = State & Actions;

const STORAGE_KEY = 'innlab.initiative-draft.v2';
const INITIAL: State = { diagnosticId: null, draft: null };

export const useInitiativeDraftStore = create<DraftStore>()(
  persist(
    (set, get) => ({
      ...INITIAL,
      initialize(diagnosticId) {
        if (get().diagnosticId === diagnosticId) return;
        set({ ...INITIAL, diagnosticId });
      },
      save(draft) {
        set({ draft });
      },
      clear() {
        set({ draft: null });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
      partialize: (s) => ({ diagnosticId: s.diagnosticId, draft: s.draft }),
    },
  ),
);

export const selectDraftDiagnosticId = (s: DraftStore) => s.diagnosticId;
export const selectDraft = (s: DraftStore) => s.draft;
export const selectDraftInitialize = (s: DraftStore) => s.initialize;
export const selectDraftSave = (s: DraftStore) => s.save;
export const selectDraftClear = (s: DraftStore) => s.clear;
