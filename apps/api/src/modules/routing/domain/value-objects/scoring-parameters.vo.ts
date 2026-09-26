/**
 * The global weights of the affinity calculation.
 *
 * They are passed as a read-only object instead of being read from a
 * global configuration so the scorer stays a pure function: the same
 * profile with the same parameters always produces the same score, which is
 * the condition for the trace to be reproducible.
 */
export interface ScoringParameters {
  readonly bottleneckWeight: number;
  readonly gapWeight: number;
  readonly moderateImbalanceWeight: number;
  readonly criticalImbalanceWeight: number;
  readonly stageAffinityWeight: number;
  readonly outOfRangePenalty: number;
  readonly minimumThreshold: number;
  readonly alternativesCount: number;
}
