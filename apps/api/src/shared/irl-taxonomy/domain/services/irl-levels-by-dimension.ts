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
 * The level is read from `dimensionResults[].irlLevel`, never from the
 * flags persisted next to it in `dimension_result`:
 *   - `is_bottleneck` is always persisted as `false`, so it says nothing;
 *   - `in_critical_state` holds semantics different from the SRS.
 * The bottleneck and the gaps are likewise taken from the computed profile,
 * not from those columns. Reading only the level keeps the consumers
 * independent of two columns whose meaning is disputed.
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
