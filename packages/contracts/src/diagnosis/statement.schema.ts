import { z } from 'zod';
import { dimensionCodeSchema } from '../irl-taxonomy/dimension.schema.js';

/**
 * A statement of the IRL questionnaire.
 *
 * KTH framework invariants:
 *   - Each dimension contains exactly 8 statements (RF-05).
 *   - The total across the 6 dimensions is 48.
 *   - `sequence` is the position within the dimension (1–8), not
 *     a global index.
 *
 * The text comes in Spanish (column `text_es` on the `statement` table).
 *
 * `id` is the bigint PK (`id_statement`) serialized as a string.
 * It is not a UUID — the table uses GENERATED ALWAYS AS IDENTITY.
 */
export const statementSchema = z
  .object({
    id: z.string().min(1).describe('Unique statement identifier (bigint as string)'),
    dimensionCode: dimensionCodeSchema,
    sequence: z.number().int().min(1).max(8).describe('Position within the dimension: 1–8'),
    text: z.string().min(1).describe('Statement text, in Spanish'),
  })
  .describe('A questionnaire statement (irl_catalog.statement)');

export type Statement = z.infer<typeof statementSchema>;
