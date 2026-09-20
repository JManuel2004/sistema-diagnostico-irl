import type { DimensionCode } from '@innlab/contracts';

/** The part of a dimension result that carries the IRL level. */
export interface DimensionLevelSource {
  readonly dimensionCode: DimensionCode;
  readonly irlLevel: number;
}

/**
 * The IRL level (1..9) of each dimension, taken from the dimension results
 * of a computed maturity profile.
 *
 * This is the single place that says **where the level comes from**.
 * `routing/` and `roadmap/` both need it, and both used to re-derive it
 * with their own copy of the same explanation (backlog 3.2).
 *
 * The level is read from `dimensionResults[].irlLevel`. The bottleneck and
 * the gaps are likewise taken from the computed profile
 * (`MaturityProfile.bottleneck()`, `gaps()`), which is where they are
 * derived; `dimension_result` keeps no bottleneck flag, and its
 * `in_critical_state` (RF-13) is a persisted derivative that consumers of
 * the profile have no need to read back.
 *
 * Pure: no IO, no validation of how many dimensions are present. A consumer
 * that needs exactly six (`roadmap/`) checks that itself and raises its own
 * error.
 */
export function irlLevelsByDimension(
  dimensionResults: readonly DimensionLevelSource[],
): Map<DimensionCode, number> {
  return new Map(dimensionResults.map((r) => [r.dimensionCode, r.irlLevel]));
}
