import { DIMENSION_CODES, type DimensionCode } from '@innlab/contracts';
import type { DependencyGraph } from '../value-objects/dependency-graph.vo.js';
import { DependencyGraphCycleError } from '../exceptions/roadmap.errors.js';

/**
 * Orders the dimensions to work on into layers.
 *
 * Kahn by layers over the **subgraph induced** by the closure: edges
 * whose source or target falls outside the set are ignored, not dragged
 * along. Without that restriction, a dependency on a dimension that
 * already meets its minimum would block the one that does need work
 * indefinitely.
 *
 * Dimensions in the same layer **are worked on in parallel**: there is
 * no dependency between them. The order within a layer is the framework's
 * canonical one, and exists only so the result is deterministic and the
 * tests reproducible. It is not a priority, and whoever renders it as a
 * numbered list will be communicating a hierarchy the system never
 * computed.
 *
 * Pure domain service.
 */
export class TopologicalLayeringService {
  layer(
    closure: ReadonlySet<DimensionCode>,
    graph: DependencyGraph,
  ): DimensionCode[][] {
    const remaining = new Set(closure);

    // Only edges internal to the induced subgraph.
    const internalEdges = graph
      .allEdges()
      .filter((e) => closure.has(e.source) && closure.has(e.target));

    const inDegree = new Map<DimensionCode, number>(
      [...closure].map((d) => [d, 0]),
    );
    for (const e of internalEdges) {
      // `target` is in the closure because of the filter above, so the
      // key exists: there is no absent case to handle.
      inDegree.set(e.target, inDegree.get(e.target)! + 1);
    }

    const layers: DimensionCode[][] = [];

    while (remaining.size > 0) {
      const layer = [...remaining].filter((d) => inDegree.get(d) === 0);

      if (layer.length === 0) {
        // Safety net. `DependencyGraph.create()` already rejected cycles,
        // so reaching here means something let one through; failing with
        // the nodes involved is preferable to returning an incomplete
        // roadmap that would look correct.
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
}
