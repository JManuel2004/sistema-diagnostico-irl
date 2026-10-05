import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { InitiativeProfileFields } from '../lib/form-values';

/**
 * Browser state between the consent and the initiative form.
 *
 * The wizard shows the consent first. Accepting it does not create an
 * initiative yet: the acceptance is of a specific initiative, and the user
 * chooses or creates that one on the next screen (RF-03, RNF-06). Until
 * then `acceptedTermsVersion` remembers the text they accepted.
 *
 * The profile form also lives here, so going back to the consent does not
 * wipe what they typed. Nothing in this store is sent until they continue
 * from the initiative step. `initiativeId` is the existing initiative they
 * chose, or the one just created, or `null` for a new one. Keeping the
 * created id means a retry after a failed profile registration does not
 * create another.
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
  /** Version of the consent text accepted on the first step, if any. */
  acceptedTermsVersion: string | null;
}

interface Actions {
  /** Switching diagnostic discards the previous one's draft. */
  initialize: (diagnosticId: string | null) => void;
  save: (draft: InitiativeDraft) => void;
  /** Records the text version accepted before the initiative is chosen. */
  acceptTerms: (version: string) => void;
  /** Drops a stale acceptance so the consent step asks again. */
  clearAcceptance: () => void;
  clear: () => void;
}

type DraftStore = State & Actions;

const STORAGE_KEY = 'innlab.initiative-draft.v2';
const INITIAL: State = { diagnosticId: null, draft: null, acceptedTermsVersion: null };

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
      acceptTerms(version) {
        set({ acceptedTermsVersion: version });
      },
      clearAcceptance() {
        set({ acceptedTermsVersion: null });
      },
      clear() {
        set({ draft: null, acceptedTermsVersion: null });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      version: 2,
      migrate(persisted) {
        const state = persisted as Partial<State>;
        return {
          diagnosticId: state.diagnosticId ?? null,
          draft: state.draft ?? null,
          acceptedTermsVersion: state.acceptedTermsVersion ?? null,
        };
      },
      partialize: (s) => ({
        diagnosticId: s.diagnosticId,
        draft: s.draft,
        acceptedTermsVersion: s.acceptedTermsVersion,
      }),
    },
  ),
);

export const selectDraftDiagnosticId = (s: DraftStore) => s.diagnosticId;
export const selectDraft = (s: DraftStore) => s.draft;
export const selectDraftInitialize = (s: DraftStore) => s.initialize;
export const selectDraftSave = (s: DraftStore) => s.save;
export const selectAcceptedTermsVersion = (s: DraftStore) => s.acceptedTermsVersion;
export const selectAcceptTerms = (s: DraftStore) => s.acceptTerms;
export const selectClearAcceptance = (s: DraftStore) => s.clearAcceptance;
export const selectDraftClear = (s: DraftStore) => s.clear;
