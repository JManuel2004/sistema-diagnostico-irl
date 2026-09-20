import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { RegisterInitiativeCommand } from '@innlab/contracts';

/**
 * Borrador del formulario de la iniciativa mientras el consentimiento no está
 * aceptado.
 *
 * El asistente pide la iniciativa antes que el consentimiento, pero el sistema
 * no guarda ningún dato de la iniciativa hasta que se acepta el tratamiento de
 * datos (RF-03, RNF-06). Entre el paso 1 y el 2 el formulario vive aquí, en el
 * navegador, y se envía al backend al aceptar. Es estado de borrador de
 * interfaz (Zustand), no estado del servidor.
 *
 * Persiste en `sessionStorage`, igual que el borrador del cuestionario: sobrevive
 * a un F5 y muere con la pestaña. Se vacía apenas la iniciativa queda registrada.
 */
interface State {
  diagnosticId: string | null;
  command: RegisterInitiativeCommand | null;
}

interface Actions {
  /** Cambiar de diagnóstico descarta el borrador del anterior. */
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
