import type { DimensionCode, ImbalancePairResult } from '@innlab/contracts';

export interface RadarPoint {
  dimension: string;
  code: string;
  level: number;
  averageLikert: number;
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

/**
 * Which dimensions the radar emphasizes: the ones under the cursor (a legend
 * item, a summary card) win over the one the user pinned by clicking.
 */
export function effectiveHighlight(
  hovered: readonly DimensionCode[],
  pinned: DimensionCode | null,
): readonly DimensionCode[] {
  if (hovered.length > 0) return hovered;
  return pinned === null ? [] : [pinned];
}

export interface DotStyle {
  readonly radius: number;
  /** Width of the ring drawn around the point; 0 means no ring. */
  readonly ringWidth: number;
  readonly opacity: number;
}

/**
 * Size and emphasis of a dimension's point. A highlighted one is larger and
 * gets a ring; while something is highlighted, the rest recede.
 */
export function dotStyle(isHighlighted: boolean, anyHighlighted: boolean): DotStyle {
  if (isHighlighted) return { radius: 8, ringWidth: 3, opacity: 1 };
  return { radius: 5, ringWidth: 0, opacity: anyHighlighted ? 0.4 : 1 };
}
