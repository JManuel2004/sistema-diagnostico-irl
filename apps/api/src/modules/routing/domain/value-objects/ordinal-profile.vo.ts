import type { DimensionCode } from '@innlab/contracts';

/**
 * A service's profile: which maturity band it serves, which stages it fits,
 * and with what ordinal intensity it tackles each IRL dimension.
 *
 * `intensities` stores labels, not numbers. The translation into values
 * happens at query time (`OrdinalTranslatorService`), not when the profile
 * is stored: computing it in advance would freeze the profile against one
 * specific calibration.
 */
export interface OrdinalProfile {
  readonly idService: number;
  readonly serviceName: string;
  readonly minLevel: number;
  readonly maxLevel: number;
  readonly relevantStages: readonly string[];
  readonly intensities: ReadonlyMap<DimensionCode, string>;
}

/** The same profile with the labels already resolved to numeric values. */
export interface NumericProfile {
  readonly idService: number;
  readonly serviceName: string;
  readonly minLevel: number;
  readonly maxLevel: number;
  readonly relevantStages: readonly string[];
  readonly intensities: ReadonlyMap<DimensionCode, number>;
  /** Original label per dimension, so the explanation needs no numbers. */
  readonly labels: ReadonlyMap<DimensionCode, string>;
}
