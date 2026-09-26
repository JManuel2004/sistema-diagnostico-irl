import type { DimensionCode } from '@innlab/contracts';
import type { DependencyGraph } from '../value-objects/dependency-graph.vo.js';
import { kahnLayers } from './kahn-layers.js';

/**
 * Orders the dimensions to work on into layers.
 *
 * Kahn by layers (`kahnLayers`) over the **subgraph induced** by the closure: edges
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
    // `DependencyGraph.create()` already rejected cycles, so a cycle error
    // here means something let one through; failing with the nodes involved
    // beats returning an incomplete roadmap that would look correct.
    return kahnLayers(closure, graph.allEdges());
  }
}
