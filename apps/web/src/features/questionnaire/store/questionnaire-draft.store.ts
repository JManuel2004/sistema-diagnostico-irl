import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { LikertValue } from '@innlab/contracts';

interface DraftState {
  diagnosticId: string | null;
  answers: Record<string, LikertValue>;
  dirty: boolean;
  initialize: (diagnosticId?: string | null) => void;
  setAnswer: (statementId: string, value: LikertValue) => void;
  reset: () => void;
  clear: () => void;
}

const DRAFT_STORAGE_KEY = 'innlab.questionnaire-draft.v1';

export const useQuestionnaireDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      diagnosticId: null,
      answers: {},
      dirty: false,
      initialize(diagnosticId?: string | null) {
        const current = get().diagnosticId;
        // If no diagnosticId provided and none set, keep current (global draft)
        if (!diagnosticId && current === null) return;
        // If same diagnostic, do nothing
        if (diagnosticId === current) return;
        // New diagnostic: reset answers and set id
        set({ diagnosticId: diagnosticId ?? null, answers: {}, dirty: false });
      },
      setAnswer(statementId: string, value: LikertValue) {
        set((s) => ({ answers: { ...s.answers, [statementId]: value }, dirty: true }));
      },
      reset() {
        set({ answers: {}, dirty: false });
      },
      clear() {
        set({ diagnosticId: null, answers: {}, dirty: false });
      },
    }),
    {
      name: DRAFT_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
      partialize: (s) => ({
        diagnosticId: s.diagnosticId,
        answers: s.answers,
      }),
    },
  ),
);

export default useQuestionnaireDraftStore;

// Typed selectors for safe usage in components
export const selectAnswers = (s: DraftState) => s.answers;
export const selectSetAnswer = (s: DraftState) => s.setAnswer;
export const selectAnswerById = (id: string) => (s: DraftState) => s.answers[id] ?? null;
