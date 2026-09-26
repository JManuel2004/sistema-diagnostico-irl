import { z } from 'zod';
import { dimensionCodeSchema } from '../irl-taxonomy/dimension.schema.js';

/**
 * Result per dimension within the maturity profile (RF-07).
 *
 * Calculation pipeline (`IrlCalculatorService` in the backend):
 *   1. Average the 8 Likert values of the dimension.
 *   2. Look up the `irlLevel` in `conversion_range` (SA-06 table) that
 *      contains that average.
 *   3. Pack average + level into this result.
 *
 * `name` (full) and `shortName` (for tight spaces) come from the catalog
 * and are included so the frontend can render the result without a second
 * call and without keeping names of its own (HU-13/14).
 */
export const dimensionResultSchema = z
  .object({
    dimensionCode: dimensionCodeSchema,
    name: z.string().min(1).describe('Full name of the dimension, in Spanish'),
    shortName: z.string().min(1).describe('Short label for tight spaces (axes, cards, lines)'),
    averageLikert: z
      .number()
      .min(1)
      .max(5)
      .describe('Average of the 8 Likert answers of the dimension (1.00–5.00)'),
    irlLevel: z
      .number()
      .int()
      .min(1)
      .max(9)
      .describe('Resulting IRL level (1–9) from the SA-06 table'),
  })
  .describe('Result of an IRL dimension in a maturity profile');

export type DimensionResult = z.infer<typeof dimensionResultSchema>;
