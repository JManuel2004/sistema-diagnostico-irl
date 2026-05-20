import { useCallback } from 'react';
import {
  selectAnswerById,
  selectSetAnswer,
  useQuestionnaireDraftStore,
} from '../store/questionnaire-draft.store';
import type { LikertValue } from '@innlab/contracts';

/**
 * `useAnswerForStatement` — puente entre `StatementCard` y el store de
 * borrador del cuestionario.
 *
 * Por qué un selector específico por `statementId`: la suscripción es
 * granular, así un cambio en otra afirmación NO causa un re-render
 * aquí. Sin esto, cada click re-renderiza las 48 tarjetas.
 */
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
