import type { ImbalancePairResult } from '@innlab/contracts';

export interface RadarPoint {
  dimension: string;
  code: string;
  level: number;
  averageLikert: number;
}

export function severityColorForLevel(level: number): string {
  if (level <= 3) return 'var(--color-critical, #A53221)';
  if (level <= 5) return 'var(--color-moderate, #8C3811)';
  return 'var(--color-acceptable, #1F633D)';
}

export function buildImbalancedVertices(
  imbalances: readonly ImbalancePairResult[] | undefined,
  pointsByCode: Map<string, RadarPoint>,
): Map<string, 'critical' | 'moderate'> {
  const map = new Map<string, 'critical' | 'moderate'>();
  if (!imbalances) return map;
  for (const imb of imbalances) {
    if (imb.classification === 'acceptable') continue;
    const la = pointsByCode.get(imb.left)?.level ?? 0;
    const lb = pointsByCode.get(imb.right)?.level ?? 0;
    const higherCode = la >= lb ? imb.left : imb.right;
    const current = map.get(higherCode);
    if (!current || (imb.classification === 'critical' && current === 'moderate')) {
      map.set(higherCode, imb.classification);
    }
  }
  return map;
}
