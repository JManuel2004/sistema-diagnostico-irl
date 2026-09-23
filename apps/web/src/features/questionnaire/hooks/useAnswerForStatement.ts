import { useCallback } from 'react';
import {
  selectAnswerById,
  selectJustificationById,
  selectSetAnswer,
  selectSetJustification,
  useQuestionnaireDraftStore,
} from '../store/questionnaire-draft.store';
import type { LikertValue } from '@innlab/contracts';

/**
 * `useAnswerForStatement` — bridge between `StatementCard` and the
 * questionnaire draft store: the Likert value and its justification.
 *
 * Why a selector specific to `statementId`: the subscription is granular,
 * so a change in another statement does NOT re-render here. Without this,
 * every click re-renders the 48 cards.
 */
export function useAnswerForStatement(statementId: string) {
  const value = useQuestionnaireDraftStore(selectAnswerById(statementId));
  const justification = useQuestionnaireDraftStore(selectJustificationById(statementId));
  const setAnswer = useQuestionnaireDraftStore(selectSetAnswer);
  const setJustification = useQuestionnaireDraftStore(selectSetJustification);

  const onChange = useCallback(
    (v: LikertValue) => {
      setAnswer(statementId, v);
    },
    [setAnswer, statementId],
  );
  const onJustify = useCallback(
    (text: string) => {
      setJustification(statementId, text);
    },
    [setJustification, statementId],
  );

  return { value, setAnswer: onChange, justification, setJustification: onJustify } as const;
}

export default useAnswerForStatement;
