import { z } from 'zod';
import { imbalanceClassificationSchema } from './imbalance.schema.js';

/**
 * Asymmetry of the profile: the difference between the highest and the
 * lowest IRL level, classified with the KTH imbalance thresholds.
 *
 * The backend computes it from the persisted levels. The client must not
 * derive this difference or its classification.
 */
export const asymmetrySchema = z
  .object({
    difference: z
      .number()
      .int()
      .min(0)
      .max(8)
      .describe('Absolute difference between the highest and the lowest IRL of the profile'),
    classification: imbalanceClassificationSchema,
  })
  .describe('Asymmetry of the maturity profile');

export type Asymmetry = z.infer<typeof asymmetrySchema>;
