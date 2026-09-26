import { z } from 'zod';
import { dimensionCodeSchema } from '../irl-taxonomy/dimension.schema.js';

/**
 * Bottleneck of the profile — the dimension(s) with the lowest IRL level
 * (RF-08).
 *
 * The backlog (HU-12) requires **handling ties**: if several dimensions
 * share the minimum, all of them are reported. That is why `dimensions` is
 * an array — the frontend must never assume size 1.
 *
 * `level` is the level shared by the tied dimensions.
 */
export const bottleneckSchema = z
  .object({
    dimensions: z
      .array(dimensionCodeSchema)
      .min(1)
      .describe('Dimension(s) with the lowest IRL level of the profile'),
    level: z
      .number()
      .int()
      .min(1)
      .max(9)
      .describe('IRL level shared by all the bottleneck dimensions'),
  })
  .describe('Bottleneck of the maturity profile (RF-08)');

export type Bottleneck = z.infer<typeof bottleneckSchema>;
