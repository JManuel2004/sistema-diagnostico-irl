import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { dimensionCodeSchema } from '../irl-taxonomy/dimension.schema.js';
import { likertValueSchema, type LikertValue } from './likert.schema.js';

/**
 * What each point of the 1..5 Likert scale says, in the user's words. One
 * source for every place that shows an answer back (the report on screen and
 * the downloaded file).
 */
export const LIKERT_LABELS: Readonly<Record<LikertValue, string>> = {
  1: 'Totalmente en desacuerdo',
  2: 'En desacuerdo',
  3: 'Ni de acuerdo ni en desacuerdo',
  4: 'De acuerdo',
  5: 'Totalmente de acuerdo',
};

/** A statement with what the user answered to it. */
export const givenAnswerSchema = z
  .object({
    statementId: z.string().min(1).describe('Statement ID (bigint as string)'),
    sequence: z.number().int().min(1).max(8).describe('Position within the dimension: 1–8'),
    text: z.string().min(1).describe('Statement text, in Spanish'),
    value: likertValueSchema,
    justification: z.string().nullable().describe('Why the user chose it; null when not given'),
  })
  .describe('A statement of the questionnaire and its answer');

export type GivenAnswer = z.infer<typeof givenAnswerSchema>;

/**
 * The answers of a diagnostic, grouped by dimension in the framework's order
 * (HU-23): the 48 statements of the diagnostic's framework version with the
 * value and the justification the user gave to each.
 */
export const dimensionAnswersSchema = z
  .object({
    dimensionCode: dimensionCodeSchema,
    name: z.string().min(1).describe('Full name of the dimension, in Spanish'),
    answers: z.array(givenAnswerSchema).describe('The statements of the dimension, in order'),
  })
  .describe('The answers given to the statements of one dimension');

export type DimensionAnswers = z.infer<typeof dimensionAnswersSchema>;

export const diagnosticAnswersSchema = z
  .object({
    diagnosticId: uuidSchema,
    dimensions: z.array(dimensionAnswersSchema),
  })
  .describe('The answers of a diagnostic, by dimension');

export type DiagnosticAnswers = z.infer<typeof diagnosticAnswersSchema>;
