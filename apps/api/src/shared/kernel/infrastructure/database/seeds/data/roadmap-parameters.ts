/**
 * How the roadmap paces and closes the route.
 *
 * ⚠ SIMULATED AND PROVISIONAL, pending INNLAB.
 */
export const ROADMAP_PARAMETERS = {
  /**
   * How many levels a dimension may rise within one phase. A larger rise is
   * split across consecutive phases.
   */
  maxLevelsPerPhase: 2,
  /**
   * The largest gap accepted at the end of the route between two paired
   * dimensions. 1 leaves no imbalance with an alert: a gap of 2 or 3 is
   * moderate and one above 3 is critical.
   */
  balanceTolerance: 1,
} as const;
