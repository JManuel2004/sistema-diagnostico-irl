/**
 * The weights of the route by phases (`PhaseAffinityScorerService`).
 *
 *  - `coverageWeight`: what working a dimension of the phase is worth, per
 *    level the phase raises it and per unit of intensity.
 *  - `minimumThreshold`: below it, the phase shows its best service marked
 *    as approximate instead of a fitting one.
 *
 * The stage affinity and the out-of-band penalty are the recommendation's
 * own (`ScoringParameters`): a service suits a stage and a band the same way
 * in both.
 */
export interface PhaseScoringParameters {
  readonly coverageWeight: number;
  readonly minimumThreshold: number;
}
