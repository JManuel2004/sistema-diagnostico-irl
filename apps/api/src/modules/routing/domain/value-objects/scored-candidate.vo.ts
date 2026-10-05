import type { DimensionCode } from '@innlab/contracts';

/**
 * An eligible service with its score and the breakdown of how it was formed.
 *
 * The breakdown is neither optional nor a debugging extra: it is what the
 * trace persists and what allows explaining a recommendation in the
 * business's ordinal vocabulary. That is why each contribution carries the
 * label that produced it and not only the resulting number.
 */
export interface DimensionContribution {
  readonly dimension: DimensionCode;
  readonly sourceLabel: string;
  readonly value: number;
}

export interface PairContribution {
  readonly pair: string;
  readonly classification: string;
  readonly sourceLabel: string;
  readonly value: number;
}

export interface ContributionBreakdown {
  readonly bottleneck: {
    readonly value: number;
    readonly details: readonly DimensionContribution[];
  };
  readonly gaps: {
    readonly value: number;
    readonly details: readonly DimensionContribution[];
  };
  readonly imbalances: {
    readonly value: number;
    readonly details: readonly PairContribution[];
  };
  readonly stageAffinity: { readonly value: number; readonly matches: boolean };
  readonly rangePenalty: {
    readonly value: number;
    readonly applied: boolean;
  };
}

export interface ScoredCandidate {
  readonly idService: number;
  readonly serviceName: string;
  readonly contributions: ContributionBreakdown;
  readonly total: number;
}

/**
 * An adjustment-only service an `INCLUDE` adjustment put into the ranking.
 * It has no score and no breakdown: it is there because the center decided
 * so, and `includedBy` says which adjustment and why. It is exempt from the
 * minimum threshold, so its position alone decides whether it becomes the
 * recommendation or an alternative.
 */
export interface IncludedCandidate {
  readonly idService: number;
  readonly serviceName: string;
  readonly includedBy: {
    readonly ruleCode: string;
    readonly declaredReason: string;
  };
}

/** A place of the ranking once layer 3 ran: calculated, or included by an adjustment. */
export type RankedCandidate = ScoredCandidate | IncludedCandidate;

export function isIncluded(
  candidate: RankedCandidate,
): candidate is IncludedCandidate {
  return 'includedBy' in candidate;
}
