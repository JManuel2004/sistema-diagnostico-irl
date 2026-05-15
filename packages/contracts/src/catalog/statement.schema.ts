import { z } from 'zod';
import { dimensionCodeSchema } from './dimension.schema.js';

/**
 * A single statement (afirmación) in the questionnaire.
 * Each of the 6 dimensions contains exactly 8 statements, for 48 total.
 */
export const statementSchema = z
  .object({
    id: z.string().uuid().describe('Unique identifier for the statement'),
    dimensionCode: dimensionCodeSchema,
    sequence: z.number().int().min(1).max(8).describe('Position within the dimension: 1–8'),
    text: z.string().min(1).describe('The statement text in Spanish'),
  })
  .describe('A single questionnaire statement (afirmación)');

export type Statement = z.infer<typeof statementSchema>;

/**
 * The complete questionnaire structure: all 6 dimensions and 48 statements,
 * organized hierarchically for HU-07 display.
 */
export const questionnaireStructureSchema = z
  .object({
    dimensions: z
      .array(
        z.object({
          code: dimensionCodeSchema,
          name: z.string(),
          description: z.string(),
          sequence: z.number().int(),
          statements: z
            .array(statementSchema)
            .length(8)
            .describe('Exactly 8 statements per dimension'),
        }),
      )
      .length(6)
      .describe('Exactly 6 dimensions'),
  })
  .describe('Complete questionnaire structure grouped by dimension');

export type QuestionnaireStructure = z.infer<typeof questionnaireStructureSchema>;
