import type { DimensionResult } from '@innlab/contracts';

export const KTH_IMBALANCE_PAIRS: readonly [string, string][] = [
  ['TRL', 'CRL'],
  ['TRL', 'BRL'],
  ['CRL', 'BRL'],
  ['TmRL', 'FRL'],
  ['BRL', 'IPRL'],
  ['TRL', 'IPRL'],
];

export type ImbalanceClassification = 'critical' | 'moderate' | 'acceptable';

export interface ImbalancePairInsight {
  readonly pair: readonly [string, string];
  readonly difference: number;
  readonly classification: ImbalanceClassification;
}

export interface ProfileInsights {
  readonly strength: { readonly level: number; readonly dimensions: readonly string[] };
  readonly bottleneck: { readonly level: number; readonly dimensions: readonly string[] };
  readonly asymmetry: number;
  readonly imbalances: readonly ImbalancePairInsight[];
}

export function classifyImbalance(difference: number): ImbalanceClassification {
  if (difference > 3) return 'critical';
  if (difference >= 2) return 'moderate';
  return 'acceptable';
}

export function computeProfileInsights(
  dimensionResults: readonly DimensionResult[],
): ProfileInsights {
  if (dimensionResults.length === 0) {
    return {
      strength: { level: 0, dimensions: [] },
      bottleneck: { level: 0, dimensions: [] },
      asymmetry: 0,
      imbalances: [],
    };
  }

  const byCode = new Map<string, number>(
    dimensionResults.map((r) => [r.dimensionCode, r.irlLevel]),
  );

  const levels = dimensionResults.map((r) => r.irlLevel);
  const maxLevel = Math.max(...levels);
  const minLevel = Math.min(...levels);

  const strengthDimensions = dimensionResults
    .filter((r) => r.irlLevel === maxLevel)
    .map((r) => r.dimensionCode);
  const bottleneckDimensions = dimensionResults
    .filter((r) => r.irlLevel === minLevel)
    .map((r) => r.dimensionCode);

  const imbalances: ImbalancePairInsight[] = [];
  for (const [a, b] of KTH_IMBALANCE_PAIRS) {
    const la = byCode.get(a);
    const lb = byCode.get(b);
    if (la === undefined || lb === undefined) continue;
    const difference = Math.abs(la - lb);
    imbalances.push({
      pair: [a, b],
      difference,
      classification: classifyImbalance(difference),
    });
  }

  return {
    strength: { level: maxLevel, dimensions: strengthDimensions },
    bottleneck: { level: minLevel, dimensions: bottleneckDimensions },
    asymmetry: maxLevel - minLevel,
    imbalances,
  };
}
