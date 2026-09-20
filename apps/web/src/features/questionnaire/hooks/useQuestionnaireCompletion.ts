import type { QuestionnaireStructure } from '@innlab/contracts';
import {
  isStatementComplete,
  selectAnswers,
  selectJustifications,
  useQuestionnaireDraftStore,
} from '../store/questionnaire-draft.store';
import { useQuestionnaireStructure } from './useQuestionnaireStructure';

type Dimension = QuestionnaireStructure['dimensions'][number];

export interface QuestionnaireCompletion {
  /** `undefined` mientras el catálogo carga. */
  readonly catalog: QuestionnaireStructure | undefined;
  readonly incompleteDimensions: readonly Dimension[];
  /** Cuántas afirmaciones de una dimensión están completas (respuesta y justificación). */
  readonly completedIn: (dimension: Dimension) => number;
  /** El catálogo cargó y las 48 afirmaciones están completas. */
  readonly isComplete: boolean;
}

/**
 * Qué le falta al borrador del cuestionario. Una afirmación está completa solo
 * con su respuesta y su justificación (RF-06); la regla vive en el store, aquí
 * solo se agrupa por dimensión.
 */
export function useQuestionnaireCompletion(): QuestionnaireCompletion {
  const { data: catalog } = useQuestionnaireStructure();
  const answers = useQuestionnaireDraftStore(selectAnswers);
  const justifications = useQuestionnaireDraftStore(selectJustifications);

  const completedIn = (dimension: Dimension): number =>
    dimension.statements.filter((s) => isStatementComplete(answers, justifications, s.id)).length;

  const incompleteDimensions =
    catalog?.dimensions.filter((dim) => completedIn(dim) < dim.statements.length) ?? [];

  return {
    catalog,
    incompleteDimensions,
    completedIn,
    isComplete: catalog !== undefined && incompleteDimensions.length === 0,
  };
}
