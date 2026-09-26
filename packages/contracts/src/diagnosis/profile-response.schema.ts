import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';
import { dimensionResultSchema } from './dimension-result.schema.js';
import { bottleneckSchema } from './bottleneck.schema.js';
import { gapsSchema } from './gaps.schema.js';
import { criticalStateSchema } from './critical-state.schema.js';
import { asymmetrySchema } from './asymmetry.schema.js';
import { imbalancePairResultSchema } from './imbalance.schema.js';

/**
 * Response of the initial maturity profile (RF-07 / HU-11–HU-15).
 *
 * Endpoint: `GET /api/v1/diagnostics/:id/profile`.
 *
 * Shape:
 *   - 6 dimension results (always 6, in dimension order).
 *   - the bottleneck (with tie handling) and the strength.
 *   - the gaps (IRL ≤ threshold; the array may be empty).
 *   - the 6 imbalance results (always the fixed pairs of the framework) —
 *     optional.
 *   - `globalAverage` (RF-09) and `criticalState` (RF-13), computed by the
 *     backend.
 *   - `computedAt`, to show the date of the calculation.
 *
 * `imbalances` is `.optional()`: the response is valid when the pairs are
 * missing from the catalog, and the frontend renders them conditionally.
 *
 * Client-side cache (STATE_MANAGEMENT.md): `staleTime: 5 minutes` — the
 * profile is an immutable snapshot once computed.
 */
export const maturityProfileResponseSchema = z
  .object({
    diagnosticId: uuidSchema,
    computedAt: z.string().datetime().describe('ISO-8601 timestamp of the profile calculation'),
    dimensionResults: z
      .array(dimensionResultSchema)
      .length(6)
      .describe('Result per dimension — exactly 6 entries'),
    globalAverage: z
      .number()
      .min(1)
      .max(9)
      .describe(
        'Global IRL average (RF-09): simple average of the six levels, to one decimal — computed by the backend; do not recompute in the client',
      ),
    bottleneck: bottleneckSchema.describe('Bottleneck — RF-08'),
    strength: bottleneckSchema.describe(
      'Dimension(s) with the highest IRL — computed by the backend from the persisted levels',
    ),
    asymmetry: asymmetrySchema.describe(
      'Max−min IRL difference — computed by the backend; do not recompute in the client',
    ),
    gaps: gapsSchema.describe(
      'Dimensions in gap (IRL ≤ threshold) — evaluated by the backend; do not recompute in the client',
    ),
    criticalState: criticalStateSchema.describe(
      'Dimensions in critical state (RF-13) — evaluated by the backend; do not recompute in the client',
    ),
    imbalances: z
      .array(imbalancePairResultSchema)
      .length(6)
      .optional()
      .describe('Analysis of the 6 pairs — absent when the pairs are missing from the catalog'),
  })
  .describe('Initial IRL maturity profile (response)');

export type MaturityProfileResponse = z.infer<typeof maturityProfileResponseSchema>;
