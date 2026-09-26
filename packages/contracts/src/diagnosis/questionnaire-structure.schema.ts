import { z } from 'zod';
import { dimensionCodeSchema } from '../irl-taxonomy/dimension.schema.js';
import { statementSchema } from './statement.schema.js';

/**
 * A dimension with its 8 statements embedded — the nested shape the
 * frontend consumes for HU-07 ("view the questionnaire organized by
 * IRL dimension").
 *
 * Keeping the nested shape (instead of returning dimensions and
 * statements separately) spares the client from joining
 * `dimension_id` ⇄ `id_dimension` itself. The response is small and
 * fixed-size (6 × 8 = 48 texts), so there is no incentive to paginate.
 */
export const dimensionWithStatementsSchema = z
  .object({
    code: dimensionCodeSchema,
    name: z.string().min(1),
    description: z.string(),
    sequence: z.number().int().min(1).max(6),
    statements: z
      .array(statementSchema)
      .length(8)
      .describe('Exactly 8 statements per dimension (RF-05)'),
  })
  .describe('A dimension with its 8 statements embedded');

export type DimensionWithStatements = z.infer<typeof dimensionWithStatementsSchema>;

/**
 * Full questionnaire structure: 6 dimensions × 8 statements.
 *
 * Endpoint: `GET /api/v1/catalog/questionnaire`.
 * Client-side cache: `staleTime: Infinity` (catalog is immutable at
 * runtime — see STATE_MANAGEMENT.md).
 */
export const questionnaireStructureSchema = z
  .object({
    frameworkVersion: z.string().describe('IRL framework version — cache-invalidation key'),
    dimensions: z
      .array(dimensionWithStatementsSchema)
      .length(6)
      .describe('Exactly 6 dimensions'),
  })
  .describe('Full IRL questionnaire structure, grouped by dimension');

export type QuestionnaireStructure = z.infer<typeof questionnaireStructureSchema>;
