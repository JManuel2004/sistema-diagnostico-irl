import { z } from 'zod';
import { likertValueSchema } from './likert.schema.js';

export const DIMENSIONS = ['trl', 'crl', 'brl', 'iprl', 'tmrl', 'frl'] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const QUESTION_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'] as const;
export type QuestionKey = (typeof QUESTION_KEYS)[number];

export const QUESTIONS_PER_DIMENSION = QUESTION_KEYS.length;
export const TOTAL_QUESTIONS = DIMENSIONS.length * QUESTIONS_PER_DIMENSION;

const dimensionAnswersSchema = z.object({
  q1: likertValueSchema,
  q2: likertValueSchema,
  q3: likertValueSchema,
  q4: likertValueSchema,
  q5: likertValueSchema,
  q6: likertValueSchema,
  q7: likertValueSchema,
  q8: likertValueSchema,
});

export type DimensionAnswers = z.infer<typeof dimensionAnswersSchema>;

export const partialDimensionAnswersSchema = dimensionAnswersSchema.partial();
export type PartialDimensionAnswers = z.infer<typeof partialDimensionAnswersSchema>;

export const questionnaireSchema = z.object({
  trl: dimensionAnswersSchema,
  crl: dimensionAnswersSchema,
  brl: dimensionAnswersSchema,
  iprl: dimensionAnswersSchema,
  tmrl: dimensionAnswersSchema,
  frl: dimensionAnswersSchema,
});

export type QuestionnaireAnswers = z.infer<typeof questionnaireSchema>;

export const partialQuestionnaireSchema = z.object({
  trl: partialDimensionAnswersSchema.optional(),
  crl: partialDimensionAnswersSchema.optional(),
  brl: partialDimensionAnswersSchema.optional(),
  iprl: partialDimensionAnswersSchema.optional(),
  tmrl: partialDimensionAnswersSchema.optional(),
  frl: partialDimensionAnswersSchema.optional(),
});

export type PartialQuestionnaireAnswers = z.infer<typeof partialQuestionnaireSchema>;

export const validateQuestionnaireResponseSchema = z.object({
  isComplete: z.boolean(),
  incompleteDimensions: z.array(z.enum(DIMENSIONS)),
  answeredCount: z.number().int().min(0).max(TOTAL_QUESTIONS),
  totalCount: z.literal(TOTAL_QUESTIONS),
});

export type ValidateQuestionnaireResponse = z.infer<typeof validateQuestionnaireResponseSchema>;
