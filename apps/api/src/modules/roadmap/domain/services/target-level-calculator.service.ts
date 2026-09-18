import type { DimensionCode } from '@innlab/contracts';
import type { DependencyGraph } from '../value-objects/dependency-graph.vo.js';

/**
 * Computes the level each dimension in the closure has to reach.
 *
 *   target[d] = max( expected minimum of d,
 *                    the highest demand of its successors inside the closure )
 *
 * The second term is what separates this from "raise everything to the
 * minimum": if a dimension enables another one that does need work, and
 * that edge requires a level above its own minimum, the target rises to
 * what the edge asks for. Taking it only to its minimum would leave the
 * dependency unsatisfied and the next phase without effect.
 *
 * Only successors **inside** the closure are considered: demanding a
 * level on behalf of a dimension that is already healthy would be work
 * with no recipient.
 *
 * Invariant: `target[d] > level[d]` for every `d` in the closure. It
 * holds by construction — a dimension enters either for being below its
 * minimum, or for being below what a successor demands — and a violation
 * would point at an error in the closure, not here.
 *
 * Pure domain service.
 */
export class TargetLevelCalculatorService {
  compute(
    closure: ReadonlySet<DimensionCode>,
    graph: DependencyGraph,
  ): Map<DimensionCode, number> {
    const targets = new Map<DimensionCode, number>();

    for (const d of closure) {
      const demands = graph
        .outgoingEdges(d)
        .filter((e) => closure.has(e.target))
        .map((e) => e.minimumRequiredLevel);

      const successorDemand = demands.length > 0 ? Math.max(...demands) : 0;

      targets.set(d, Math.max(graph.expectedMinimum(d), successorDemand));
    }

    return targets;
  }
}
