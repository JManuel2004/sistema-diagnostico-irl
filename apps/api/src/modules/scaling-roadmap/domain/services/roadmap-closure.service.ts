import type { DimensionCode } from '@innlab/contracts';
import type { DependencyGraph } from '../value-objects/dependency-graph.vo.js';

/**
 * Determines which dimensions have to be worked on.
 *
 * Pure domain service: no IO, no decorators, no framework.
 *
 * Starts from the **focus** — the dimensions below their expected
 * minimum — and closes it backwards: if a dimension in the set has an
 * enabler that does not reach the level that edge requires, the enabler
 * joins too, because pushing a dimension whose prerequisite is still
 * short achieves nothing.
 *
 * ── Fixed point, not a single pass ──────────────────────────────────
 *
 * The closure is computed with a worklist until no new nodes enter, and
 * that is a deliberate correction to the original design of the
 * approach, which made a single pass over the focus. A single pass is
 * incorrect in the general case: if an enabler `u` joins and `u` in turn
 * has an insufficient enabler `t`, `t` would never enter and the phase
 * order would come out incomplete — without anything failing visibly.
 *
 * With the seeded graph and the AgroConecta profile both versions agree
 * (the closure equals the focus), so the correction does not change that
 * case; it avoids a latent failure on other profiles.
 *
 * Always terminates: each dimension enters the queue at most once and
 * there are six.
 */
export class RoadmapClosureService {
  compute(
    levels: ReadonlyMap<DimensionCode, number>,
    graph: DependencyGraph,
  ): Set<DimensionCode> {
    const closure = new Set<DimensionCode>();
    const pending: DimensionCode[] = [];

    for (const d of graph.nodes()) {
      const level = levels.get(d);
      if (level !== undefined && level < graph.expectedMinimum(d)) {
        closure.add(d);
        pending.push(d);
      }
    }

    while (pending.length > 0) {
      const target = pending.shift()!;
      for (const edge of graph.incomingEdges(target)) {
        const sourceLevel = levels.get(edge.source);
        if (sourceLevel === undefined) continue;
        if (
          sourceLevel < edge.minimumRequiredLevel &&
          !closure.has(edge.source)
        ) {
          closure.add(edge.source);
          // The enabler also needs ITS own enablers reviewed: this is
          // what a single pass would miss.
          pending.push(edge.source);
        }
      }
    }

    return closure;
  }
}
