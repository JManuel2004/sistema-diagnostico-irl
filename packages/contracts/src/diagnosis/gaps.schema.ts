import { z } from 'zod';
import { dimensionCodeSchema } from '../irl-taxonomy/dimension.schema.js';

/**
 * IRL gap threshold (RF-14 / critical state per dimension).
 *
 * A dimension is in gap when its IRL level is lower than or equal to this
 * value. The constant lives in the contract so the API and the SPA do not
 * make up the number; the backend does the evaluation.
 */
export const CRITICAL_IRL_THRESHOLD = 3;

/**
 * Dimensions in gap of the profile — those with `irlLevel` ≤ threshold.
 *
 * Unlike the bottleneck, the array **may be empty**: a profile with every
 * level above the threshold has no gap. The frontend must not recompute
 * this set from `irlLevel`.
 */
export const gapsSchema = z
  .object({
    dimensions: z
      .array(dimensionCodeSchema)
      .describe('Dimensions whose IRL level is at or below the gap threshold'),
    threshold: z
      .number()
      .int()
      .min(1)
      .max(9)
      .describe('IRL gap threshold applied when computing this snapshot'),
  })
  .describe('Dimension gaps of the maturity profile (IRL ≤ threshold)');

export type Gaps = z.infer<typeof gapsSchema>;
