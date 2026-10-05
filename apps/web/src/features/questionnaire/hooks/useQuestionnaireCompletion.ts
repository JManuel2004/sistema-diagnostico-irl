import type { QuestionnaireStructure } from '@innlab/contracts';
import {
  isStatementComplete,
  selectAnswers,
  useQuestionnaireDraftStore,
} from '../store/questionnaire-draft.store';
import { useQuestionnaireStructure } from './useQuestionnaireStructure';

type Dimension = QuestionnaireStructure['dimensions'][number];

export interface QuestionnaireCompletion {
  /** `undefined` while the catalog loads. */
  readonly catalog: QuestionnaireStructure | undefined;
  readonly incompleteDimensions: readonly Dimension[];
  /** How many statements of a dimension are complete (answered). */
  readonly completedIn: (dimension: Dimension) => number;
  /** The catalog loaded and the 48 statements are complete. */
  readonly isComplete: boolean;
}

/**
 * What the questionnaire draft is missing. A statement is complete with
 * its answer; the justification is optional (RF-06). The rule lives in the
 * store, here it is only grouped by dimension, over the statements of the
 * diagnostic's framework version.
 */
export function useQuestionnaireCompletion(frameworkVersion: string): QuestionnaireCompletion {
  const { data: catalog } = useQuestionnaireStructure(frameworkVersion);
  const answers = useQuestionnaireDraftStore(selectAnswers);

  const completedIn = (dimension: Dimension): number =>
    dimension.statements.filter((s) => isStatementComplete(answers, s.id)).length;

  const incompleteDimensions =
    catalog?.dimensions.filter((dim) => completedIn(dim) < dim.statements.length) ?? [];

  return {
    catalog,
    incompleteDimensions,
    completedIn,
    isComplete: catalog !== undefined && incompleteDimensions.length === 0,
  };
}
