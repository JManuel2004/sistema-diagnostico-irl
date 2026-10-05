import type { DiagnosticFacts, DimensionCode } from '@innlab/contracts';
import type { NumericProfile } from '../value-objects/ordinal-profile.vo.js';
import type { ScoringParameters } from '../value-objects/scoring-parameters.vo.js';
import type { PhaseScoringParameters } from '../value-objects/phase-scoring-parameters.vo.js';
import type { ScoredCandidate } from '../value-objects/scored-candidate.vo.js';

/** A dimension a phase of the roadmap raises, and how much. */
export interface PhaseDimensionWork {
  readonly dimension: DimensionCode;
  readonly fromLevel: number;
  readonly toLevel: number;
}

/** How a service works one dimension of the phase. */
export interface CoverageDetail {
  readonly dimension: DimensionCode;
  /** The ordinal label of the service in that dimension. */
  readonly sourceLabel: string;
  /** How many levels the phase raises the dimension. */
  readonly levels: number;
  readonly value: number;
}

/**
 * A candidate of a phase. It is a `ScoredCandidate` so layer 3 (the
 * adjustments) treats it like any other place of a ranking; its own
 * breakdown is `coverage`, and the recommendation's terms that do not apply
 * to a phase (bottleneck, gaps, imbalances) are zero.
 */
export interface PhaseCandidate extends ScoredCandidate {
  readonly coverage: {
    readonly value: number;
    readonly details: readonly CoverageDetail[];
  };
}

/**
 * Layer 2 of the route by phases — how well a service works the dimensions
 * of one phase of the roadmap.
 *
 *   score = coverage + stage affinity − range penalty
 *   coverage = coverage weight × Σ over the phase's dimensions of
 *              intensity × levels the phase raises it
 *
 * The recommendation measures the **need** of the whole profile, so it
 * drops as the profile improves: re-running it on a projected profile ends
 * in «sin recomendación» after a couple of phases. A phase asks something
 * else — which service raises *these* dimensions by *these* levels — and
 * this score answers that. The stage and the band count as in the
 * recommendation: the band is checked against the average projected to the
 * start of the phase.
 *
 * Pure and deterministic.
 */
export class PhaseAffinityScorerService {
  score(
    eligible: readonly NumericProfile[],
    work: readonly PhaseDimensionWork[],
    facts: DiagnosticFacts,
    parameters: ScoringParameters,
    phase: PhaseScoringParameters,
  ): PhaseCandidate[] {
    return eligible.map((profile) => {
      const details = work.map((w) => {
        const levels = Math.max(0, w.toLevel - w.fromLevel);
        const intensity = profile.intensities.get(w.dimension) ?? 0;
        return {
          dimension: w.dimension,
          sourceLabel: profile.labels.get(w.dimension) ?? 'not_applicable',
          levels,
          value: round3(phase.coverageWeight * intensity * levels),
        };
      });
      const coverage = round3(details.reduce((sum, d) => sum + d.value, 0));
      const stage = facts.characterization.stage;
      const matches = stage !== null && profile.relevantStages.includes(stage);
      const stageValue = matches ? parameters.stageAffinityWeight : 0;
      const outOfBand =
        facts.averageLevel < profile.minLevel ||
        facts.averageLevel > profile.maxLevel;
      const penalty = outOfBand ? parameters.outOfRangePenalty : 0;

      return {
        idService: profile.idService,
        serviceName: profile.serviceName,
        coverage: { value: coverage, details },
        contributions: {
          bottleneck: { value: 0, details: [] },
          gaps: { value: 0, details: [] },
          imbalances: { value: 0, details: [] },
          stageAffinity: { value: stageValue, matches },
          rangePenalty: { value: penalty, applied: outOfBand },
        },
        total: round3(coverage + stageValue - penalty),
      };
    });
  }
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
