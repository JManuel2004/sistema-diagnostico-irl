export const DIMENSIONS = ['trl', 'crl', 'brl', 'iprl', 'tmrl', 'frl'] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const QUESTION_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'] as const;
export type QuestionKey = (typeof QUESTION_KEYS)[number];

export const QUESTIONS_PER_DIMENSION = QUESTION_KEYS.length;
export const TOTAL_QUESTIONS = DIMENSIONS.length * QUESTIONS_PER_DIMENSION;

export type PartialDimensionAnswers = Partial<Record<QuestionKey, number>>;
export type PartialQuestionnaire = Partial<Record<Dimension, PartialDimensionAnswers>>;

export interface ValidationResult {
  isComplete: boolean;
  incompleteDimensions: Dimension[];
  answeredCount: number;
  totalCount: number;
}

export function validateCompleteness(answers: PartialQuestionnaire): ValidationResult {
  const incompleteDimensions: Dimension[] = [];
  let answeredCount = 0;

  for (const dim of DIMENSIONS) {
    const dimAnswers = answers[dim];
    let dimCount = 0;

    for (const key of QUESTION_KEYS) {
      if (dimAnswers !== undefined && dimAnswers[key] !== undefined) {
        answeredCount++;
        dimCount++;
      }
    }

    if (dimCount < QUESTIONS_PER_DIMENSION) {
      incompleteDimensions.push(dim);
    }
  }

  return {
    isComplete: incompleteDimensions.length === 0,
    incompleteDimensions,
    answeredCount,
    totalCount: TOTAL_QUESTIONS,
  };
}
