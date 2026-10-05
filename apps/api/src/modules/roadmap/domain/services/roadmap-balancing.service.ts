import {
  DIMENSION_CODES,
  IMBALANCE_PAIRS,
  type DimensionCode,
  type RoadmapInclusionReason,
  type RoadmapTargetReason,
} from '@innlab/contracts';
import type { DependencyGraph } from '../value-objects/dependency-graph.vo.js';

/** The final target of a dimension, and why. */
export interface FinalTarget {
  readonly target: number;
  readonly inclusionReason: RoadmapInclusionReason;
  readonly targetReason: RoadmapTargetReason;
  /** The dependent that needs it higher, or the paired dimension it keeps up with. */
  readonly targetDrivenBy: DimensionCode | null;
}

/**
 * Closes the route so it ends **balanced**: no pair of the framework's six
 * is left more than `tolerance` levels apart.
 *
 * Starts from the targets the minimums and the dependencies already set
 * (`RoadmapClosureService` + `TargetLevelCalculatorService`) and repeats,
 * until nothing changes:
 *
 *  1. Balance: in each pair whose projected gap exceeds the tolerance, the
 *     lower dimension rises to `higher − tolerance`. A dimension is never
 *     lowered: the route only adds work.
 *  2. Dependencies: a dimension that now has to rise needs its enablers at
 *     the level each edge requires, as when the roadmap was closed.
 *
 * It always ends: targets only go up and stop at the highest level any
 * dimension already has (or 9).
 *
 * A dimension that only rises because of step 1 enters the roadmap with
 * `BALANCE` as its reason. Pure domain service.
 */
export class RoadmapBalancingService {
  balance(
    levels: ReadonlyMap<DimensionCode, number>,
    targets: ReadonlyMap<DimensionCode, number>,
    graph: DependencyGraph,
    tolerance: number,
  ): Map<DimensionCode, FinalTarget> {
    const projected = new Map<DimensionCode, number>(
      DIMENSION_CODES.map((d) => [
        d,
        Math.max(levels.get(d) ?? 1, targets.get(d) ?? 0),
      ]),
    );

    let changed = true;
    while (changed) {
      changed = false;
      for (const [a, b] of IMBALANCE_PAIRS) {
        const [high, low] =
          projected.get(a)! >= projected.get(b)! ? [a, b] : [b, a];
        const floor = projected.get(high)! - tolerance;
        if (projected.get(low)! < floor) {
          projected.set(low, floor);
          changed = true;
        }
      }
      for (const edge of graph.allEdges()) {
        const worked =
          projected.get(edge.target)! > (levels.get(edge.target) ?? 1);
        if (worked && projected.get(edge.source)! < edge.minimumRequiredLevel) {
          projected.set(edge.source, edge.minimumRequiredLevel);
          changed = true;
        }
      }
    }

    const worked = new Set(
      DIMENSION_CODES.filter((d) => projected.get(d)! > (levels.get(d) ?? 1)),
    );
    const result = new Map<DimensionCode, FinalTarget>();
    for (const d of DIMENSION_CODES) {
      if (!worked.has(d)) continue;
      const level = levels.get(d) ?? 1;
      const target = projected.get(d)!;
      const minimum = graph.expectedMinimum(d);
      const demands = graph
        .outgoingEdges(d)
        .filter((e) => worked.has(e.target) && e.minimumRequiredLevel > level);

      const inclusionReason: RoadmapInclusionReason =
        level < minimum
          ? 'BELOW_EXPECTED_MINIMUM'
          : demands.length > 0
            ? 'REQUIRED_ENABLER'
            : 'BALANCE';

      const demandSetting = demands
        .filter((e) => e.minimumRequiredLevel === target)
        .sort(
          (x, y) =>
            DIMENSION_CODES.indexOf(x.target) -
            DIMENSION_CODES.indexOf(y.target),
        )[0];
      const partner = IMBALANCE_PAIRS.flatMap(([a, b]) =>
        a === d ? [b] : b === d ? [a] : [],
      )
        .filter((p) => projected.get(p)! - tolerance === target)
        .sort(
          (x, y) => DIMENSION_CODES.indexOf(x) - DIMENSION_CODES.indexOf(y),
        )[0];

      let targetReason: RoadmapTargetReason;
      let targetDrivenBy: DimensionCode | null;
      if (target === minimum && level < minimum) {
        targetReason = 'EXPECTED_MINIMUM';
        targetDrivenBy = null;
      } else if (demandSetting) {
        targetReason = 'ENABLES';
        targetDrivenBy = demandSetting.target;
      } else if (partner) {
        targetReason = 'BALANCE';
        targetDrivenBy = partner;
      } else {
        targetReason = 'EXPECTED_MINIMUM';
        targetDrivenBy = null;
      }
      result.set(d, { target, inclusionReason, targetReason, targetDrivenBy });
    }
    return result;
  }

  /** True when no pair is left more than `tolerance` levels apart. */
  static isBalanced(
    finalLevels: ReadonlyMap<DimensionCode, number>,
    tolerance: number,
  ): boolean {
    return IMBALANCE_PAIRS.every(
      ([a, b]) =>
        Math.abs((finalLevels.get(a) ?? 1) - (finalLevels.get(b) ?? 1)) <=
        tolerance,
    );
  }
}
