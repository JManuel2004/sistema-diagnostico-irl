import { DIMENSION_CODES, type DimensionCode } from '@innlab/contracts';
import type { DependencyEdgeSnapshot } from '../repositories/dependency-graph.repository.port.js';
import { DependencyGraphCycleError } from '../exceptions/roadmap.errors.js';

/**
 * Kahn's algorithm by layers: the single traversal both consumers share.
 *
 *   - `DependencyGraph.create()` runs it over the whole graph to reject
 *     cycles (the layers themselves are discarded).
 *   - `TopologicalLayeringService` runs it over the subgraph induced by the
 *     closure to produce the roadmap phases.
 *
 * Each used to have its own copy of the loop.
 *
 * Only edges whose two ends are in `nodes` count; the rest are ignored, not
 * dragged along — a dependency on a dimension outside the set must not block
 * one inside it. Nodes in the same layer have no dependency between them;
 * their order is the framework's canonical one, kept only so the result is
 * deterministic.
 *
 * @throws DependencyGraphCycleError when nodes remain but none is free —
 *   they are in a cycle or depend on one.
 */
export function kahnLayers(
  nodes: ReadonlySet<DimensionCode>,
  edges: readonly DependencyEdgeSnapshot[],
): DimensionCode[][] {
  const internalEdges = edges.filter(
    (e) => nodes.has(e.source) && nodes.has(e.target),
  );

  const inDegree = new Map<DimensionCode, number>(
    [...nodes].map((d) => [d, 0]),
  );
  for (const e of internalEdges) {
    // `target` is in `nodes` because of the filter above.
    inDegree.set(e.target, inDegree.get(e.target)! + 1);
  }

  const remaining = new Set(nodes);
  const layers: DimensionCode[][] = [];

  while (remaining.size > 0) {
    const layer = [...remaining].filter((d) => inDegree.get(d) === 0);

    if (layer.length === 0) {
      throw new DependencyGraphCycleError([...remaining]);
    }

    layer.sort(
      (a, b) => DIMENSION_CODES.indexOf(a) - DIMENSION_CODES.indexOf(b),
    );
    layers.push(layer);

    for (const d of layer) remaining.delete(d);
    for (const e of internalEdges) {
      if (layer.includes(e.source) && remaining.has(e.target)) {
        inDegree.set(e.target, inDegree.get(e.target)! - 1);
      }
    }
  }

  return layers;
}
