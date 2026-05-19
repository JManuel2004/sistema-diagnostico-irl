import { useCallback } from 'react';
import {
  useQuestionnaireDraftStore,
  selectAnswerById,
  selectSetAnswer,
} from '../store/questionnaire-draft.store';
import type { LikertValue } from '@innlab/contracts';

export function useAnswerForStatement(statementId: string) {
  const value = useQuestionnaireDraftStore(selectAnswerById(statementId));
  const setAnswer = useQuestionnaireDraftStore(selectSetAnswer);

  const onChange = useCallback(
    (v: LikertValue) => {
      setAnswer(statementId, v);
    },
    [setAnswer, statementId],
  );

  return { value, setAnswer: onChange } as const;
}

export default useAnswerForStatement;
