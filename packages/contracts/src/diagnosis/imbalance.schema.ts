import { z } from 'zod';
import { dimensionCodeSchema } from '../irl-taxonomy/dimension.schema.js';

/**
 * Classification of the imbalance between two dimensions (RF-10):
 *
 *   - `critical`    — difference > 3 IRL levels
 *   - `moderate`    — difference of 2 or 3 IRL levels
 *   - `acceptable`  — difference < 2 IRL levels
 *
 * The thresholds belong to the KTH framework and are not negotiable. The
 * frontend uses the classification to decide color, icon and text in the
 * list of imbalances (HU-15).
 */
export const imbalanceClassificationSchema = z
  .enum(['critical', 'moderate', 'acceptable'])
  .describe('Classification of the imbalance between a pair of dimensions');

export type ImbalanceClassification = z.infer<typeof imbalanceClassificationSchema>;

/**
 * The six pairs evaluated for imbalance according to the KTH framework —
 * the system **always** evaluates these and only these.
 */
export const IMBALANCE_PAIRS = [
  ['TRL', 'CRL'],
  ['TRL', 'BRL'],
  ['CRL', 'BRL'],
  ['TmRL', 'FRL'],
  ['BRL', 'IPRL'],
  ['TRL', 'IPRL'],
] as const;

/**
 * Result of evaluating a pair of dimensions for imbalance.
 *
 * Order convention: `(left, right)` follow the order listed in
 * `IMBALANCE_PAIRS`. The framework's `diff(leftLevel, rightLevel)` is
 * order-insensitive (`abs(a - b)`), but fixing the order in the contract
 * makes matching easier in tests and in the UI.
 */
export const imbalancePairResultSchema = z
  .object({
    left: dimensionCodeSchema,
    right: dimensionCodeSchema,
    difference: z
      .number()
      .int()
      .min(0)
      .max(8)
      .describe('Absolute difference between the IRL levels of the pair'),
    classification: imbalanceClassificationSchema,
  })
  .describe('Result of the imbalance analysis for a pair of dimensions');

export type ImbalancePairResult = z.infer<typeof imbalancePairResultSchema>;
