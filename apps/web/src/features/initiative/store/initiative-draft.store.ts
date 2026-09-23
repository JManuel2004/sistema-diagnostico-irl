import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { RegisterInitiativeCommand } from '@innlab/contracts';

/**
 * Draft of the initiative form while the consent is not accepted.
 *
 * The wizard asks for the initiative before the consent, but the system
 * stores no data of the initiative until the data processing is accepted
 * (RF-03, RNF-06). Between steps 1 and 2 the form lives here, in the
 * browser, and is sent to the backend on acceptance. It is interface draft
 * state (Zustand), not server state.
 *
 * It persists in `sessionStorage`, like the questionnaire draft: it
 * survives an F5 and dies with the tab. It is emptied as soon as the
 * initiative is registered.
 */
interface State {
  diagnosticId: string | null;
  command: RegisterInitiativeCommand | null;
}

interface Actions {
  /** Switching diagnostic discards the previous one's draft. */
  initialize: (diagnosticId: string | null) => void;
  save: (command: RegisterInitiativeCommand) => void;
  clear: () => void;
}

type DraftStore = State & Actions;

const STORAGE_KEY = 'innlab.initiative-draft.v1';
const INITIAL: State = { diagnosticId: null, command: null };

export const useInitiativeDraftStore = create<DraftStore>()(
  persist(
    (set, get) => ({
      ...INITIAL,
      initialize(diagnosticId) {
        if (get().diagnosticId === diagnosticId) return;
        set({ ...INITIAL, diagnosticId });
      },
      save(command) {
        set({ command });
      },
      clear() {
        set({ command: null });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
      partialize: (s) => ({ diagnosticId: s.diagnosticId, command: s.command }),
    },
  ),
);

export const selectDraftDiagnosticId = (s: DraftStore) => s.diagnosticId;
export const selectDraftCommand = (s: DraftStore) => s.command;
export const selectDraftInitialize = (s: DraftStore) => s.initialize;
export const selectDraftSave = (s: DraftStore) => s.save;
export const selectDraftClear = (s: DraftStore) => s.clear;
