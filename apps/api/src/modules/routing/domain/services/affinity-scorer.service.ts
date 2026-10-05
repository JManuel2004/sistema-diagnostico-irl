import type { DimensionCode, DiagnosticFacts } from '@innlab/contracts';
import type { NumericProfile } from '../value-objects/ordinal-profile.vo.js';
import type { ScoringParameters } from '../value-objects/scoring-parameters.vo.js';
import type { ScoredCandidate } from '../value-objects/scored-candidate.vo.js';

/**
 * Layer 2 — the affinity calculation.
 *
 * Pure and deterministic: the same facts, profiles and parameters always
 * produce the same score. That is what keeps the trace reproducible months
 * later.
 *
 *   score = bottleneck_contribution
 *           + gaps_contribution
 *           + imbalances_contribution
 *           + stage_affinity_contribution
 *           − range_penalty
 *
 * Each term is recorded separately **together with the ordinal label that
 * produced it**. Keeping the label next to the number is what allows
 * explaining without exposing the calibration: the justification can say
 * "because this service is *primary* in Business Model" instead of
 * "because it contributed 1.50".
 */
export class AffinityScorerService {
  score(
    eligible: readonly NumericProfile[],
    facts: DiagnosticFacts,
    parameters: ScoringParameters,
  ): ScoredCandidate[] {
    return eligible.map((profile) =>
      this.scoreProfile(profile, facts, parameters),
    );
  }

  private scoreProfile(
    profile: NumericProfile,
    facts: DiagnosticFacts,
    p: ScoringParameters,
  ): ScoredCandidate {
    const bottleneck = this.bottleneckContribution(profile, facts, p);
    const gaps = this.gapsContribution(profile, facts, p);
    const imbalances = this.imbalancesContribution(profile, facts, p);
    const stageAffinity = this.stageAffinityContribution(profile, facts, p);
    const rangePenalty = this.rangePenalty(profile, facts, p);

    const total =
      bottleneck.value +
      gaps.value +
      imbalances.value +
      stageAffinity.value -
      rangePenalty.value;

    return {
      idService: profile.idService,
      serviceName: profile.serviceName,
      contributions: {
        bottleneck,
        gaps,
        imbalances,
        stageAffinity,
        rangePenalty,
      },
      total: round3(total),
    };
  }

  /**
   * The sharpest problem weighs more than an ordinary gap.
   *
   * On a tie (several dimensions share the lowest IRL) the service's
   * intensities over all of them are averaged. Averaging treats the tie
   * symmetrically: it values the service's capacity equally in every tied
   * dimension. Taking the minimum would be more conservative and the maximum
   * more generous; both break that symmetry.
   */
  private bottleneckContribution(
    profile: NumericProfile,
    facts: DiagnosticFacts,
    p: ScoringParameters,
  ) {
    const bottleneckDimensions = facts.bottlenecks;
    const details = bottleneckDimensions.map((dim) => ({
      dimension: dim,
      sourceLabel: labelOf(profile, dim),
      value: intensityOf(profile, dim),
    }));
    const average =
      bottleneckDimensions.length === 0
        ? 0
        : details.reduce((acc, d) => acc + d.value, 0) /
          bottleneckDimensions.length;

    return { value: round3(p.bottleneckWeight * average), details };
  }

  /**
   * The intensities over the dimensions in gap are **added**, not averaged:
   * a service that covers three gaps must score higher than one that covers
   * one, as long as it does so meaningfully. If the effect turns out
   * excessive, the fix is lowering `gapWeight`, not changing the shape of the
   * term.
   */
  private gapsContribution(
    profile: NumericProfile,
    facts: DiagnosticFacts,
    p: ScoringParameters,
  ) {
    const details = facts.gaps.map((dim) => ({
      dimension: dim,
      sourceLabel: labelOf(profile, dim),
      value: intensityOf(profile, dim),
    }));
    const sum = details.reduce((acc, d) => acc + d.value, 0);
    return { value: round3(p.gapWeight * sum), details };
  }

  /**
   * Imbalance contribution, **weighted by intensity** (decision D-3).
   *
   *   contribution = Σ weight(classification) × max(intensity[left], intensity[right])
   *
   * over the six fixed pairs of the framework. `ACCEPTABLE` pairs contribute
   * nothing.
   *
   * It is weighted instead of counting binary coverage because the
   * contribution must reflect whether the service *can do something* about
   * that imbalance. With binary coverage, a service with a wide profile but a
   * marginal intensity in the affected dimensions scores the same as one that
   * tackles them head on, so the term would reward having a wide profile
   * instead of being relevant.
   *
   * The maximum of the pair's two dimensions is taken, not the sum, because
   * the imbalance is a property of the pair, not of each end: counting both
   * would count it twice.
   */
  private imbalancesContribution(
    profile: NumericProfile,
    facts: DiagnosticFacts,
    p: ScoringParameters,
  ) {
    const details = facts.imbalances
      .map((d) => {
        const weight =
          d.classification === 'CRITICAL'
            ? p.criticalImbalanceWeight
            : d.classification === 'MODERATE'
              ? p.moderateImbalanceWeight
              : 0;
        const leftIntensity = intensityOf(profile, d.left);
        const rightIntensity = intensityOf(profile, d.right);
        const dominant = leftIntensity >= rightIntensity ? d.left : d.right;
        return {
          pair: `${d.left}-${d.right}`,
          classification: d.classification,
          sourceLabel: labelOf(profile, dominant),
          value: round3(weight * Math.max(leftIntensity, rightIntensity)),
        };
      })
      .filter((d) => d.value > 0);

    const sum = details.reduce((acc, d) => acc + d.value, 0);
    return { value: round3(sum), details };
  }

  /**
   * Stage affinity. An unregistered stage (`null`) matches none: missing
   * characterization must not give points away.
   */
  private stageAffinityContribution(
    profile: NumericProfile,
    facts: DiagnosticFacts,
    p: ScoringParameters,
  ) {
    const stage = facts.characterization.stage;
    const matches = stage !== null && profile.relevantStages.includes(stage);
    return { value: matches ? round3(p.stageAffinityWeight) : 0, matches };
  }

  /**
   * Penalty for operating outside the service's maturity band. A boolean
   * comparison against the average level: inside or outside, with no
   * gradient at the edge.
   */
  private rangePenalty(
    profile: NumericProfile,
    facts: DiagnosticFacts,
    p: ScoringParameters,
  ) {
    const outside =
      facts.averageLevel < profile.minLevel ||
      facts.averageLevel > profile.maxLevel;
    return {
      value: outside ? round3(p.outOfRangePenalty) : 0,
      applied: outside,
    };
  }
}

function intensityOf(profile: NumericProfile, dim: DimensionCode): number {
  return profile.intensities.get(dim) ?? 0;
}

function labelOf(profile: NumericProfile, dim: DimensionCode): string {
  return profile.labels.get(dim) ?? 'not_applicable';
}

/**
 * Scores are persisted as `numeric(8,3)`. Rounding to three decimals in the
 * domain keeps a floating-point residue from making the computed value and
 * the one read back from the database differ, which would break the
 * reproducibility check.
 */
function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
