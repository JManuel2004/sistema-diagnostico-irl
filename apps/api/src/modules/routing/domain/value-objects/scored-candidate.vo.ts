import type { DimensionCode } from '@innlab/contracts';

/**
 * Un servicio elegible con su score y el desglose de cómo se formó.
 *
 * El desglose no es opcional ni un extra de depuración: es lo que la
 * traza persiste y lo que permite explicar una recomendación en el
 * vocabulario ordinal del negocio. Por eso cada aporte lleva la label
 * que lo originó y no solo el número resultante.
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
