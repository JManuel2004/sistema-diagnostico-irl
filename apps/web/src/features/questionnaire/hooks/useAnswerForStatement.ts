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
 * `useAnswerForStatement` — puente entre `StatementCard` y el store de
 * borrador del cuestionario: el valor Likert y su justificación.
 *
 * Por qué un selector específico por `statementId`: la suscripción es
 * granular, así un cambio en otra afirmación NO causa un re-render
 * aquí. Sin esto, cada click re-renderiza las 48 tarjetas.
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
