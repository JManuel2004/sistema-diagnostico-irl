import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { LikertValue } from '@innlab/contracts';

interface DraftState {
  answers: Record<string, LikertValue>;
  setAnswer: (statementId: string, value: LikertValue) => void;
  getAnswer: (statementId: string) => LikertValue | null;
  countAnsweredInDimension: (statementIds: string[]) => number;
  clear: () => void;
}

export const useQuestionnaireDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      answers: {},
      setAnswer(statementId: string, value: LikertValue) {
        set((s) => ({ answers: { ...s.answers, [statementId]: value } }));
      },
      getAnswer(statementId: string) {
        return get().answers[statementId] ?? null;
      },
      countAnsweredInDimension(statementIds: string[]) {
        const answers = get().answers;
        return statementIds.filter((id) => answers[id] !== undefined).length;
      },
      clear() {
        set({ answers: {} });
      },
    }),
    {
      name: 'questionnaire-draft',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);

export default useQuestionnaireDraftStore;

// Typed selectors for safe usage in components
export const selectAnswers = (s: DraftState) => s.answers;
export const selectSetAnswer = (s: DraftState) => s.setAnswer;
export const selectAnswerById = (id: string) => (s: DraftState) => s.answers[id] ?? null;
