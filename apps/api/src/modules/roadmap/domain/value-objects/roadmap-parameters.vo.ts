/**
 * How the roadmap paces and closes the route.
 *
 *  - `maxLevelsPerPhase`: how many levels a dimension may rise within one
 *    phase; a larger rise is split across consecutive phases.
 *  - `balanceTolerance`: the largest gap accepted at the end of the route
 *    between two paired dimensions. 1 leaves no imbalance with an alert.
 */
export interface RoadmapParameters {
  readonly maxLevelsPerPhase: number;
  readonly balanceTolerance: number;
}
