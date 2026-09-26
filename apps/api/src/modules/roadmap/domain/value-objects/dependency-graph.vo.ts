import { DIMENSION_CODES, type DimensionCode } from '@innlab/contracts';
import { RoadmapCalculationError } from '../exceptions/roadmap.errors.js';
import { kahnLayers } from '../services/kahn-layers.js';
import {
  IRL_MAX_LEVEL,
  IRL_MIN_LEVEL,
  isValidIrlLevel,
} from '../../../../shared/kernel/domain/value-objects/irl-level.vo.js';
import type {
  DependencyEdgeSnapshot,
  DimensionMinimumSnapshot,
} from '../repositories/dependency-graph.repository.port.js';

/**
 * The validated directed graph of dependencies between dimensions.
 *
 * Immutable value object with a private constructor and a static
 * factory, the same pattern as `EscalaCalibracion` in the router: if an
 * instance exists its invariants hold, and no consumer has to re-check
 * them.
 *
 * What is validated on construction:
 *   - all six dimensions have a declared expected minimum;
 *   - no edge is reflexive or duplicated;
 *   - every level falls in [1, 9];
 *   - the graph is acyclic.
 *
 * Acyclicity is checked here and not only in the database because the
 * database cannot see it: `UNIQUE (source, target)` prevents duplicates,
 * not A→B→C→A closing a loop.
 */
export class DependencyGraph {
  private constructor(
    private readonly edges: readonly DependencyEdgeSnapshot[],
    private readonly minimums: ReadonlyMap<DimensionCode, number>,
    private readonly incoming: ReadonlyMap<DimensionCode, readonly DependencyEdgeSnapshot[]>,
    private readonly outgoing: ReadonlyMap<DimensionCode, readonly DependencyEdgeSnapshot[]>,
  ) {}

  static create(
    edges: readonly DependencyEdgeSnapshot[],
    minimums: readonly DimensionMinimumSnapshot[],
  ): DependencyGraph {
    const byDimension = new Map<DimensionCode, number>();
    for (const m of minimums) {
      if (byDimension.has(m.dimension)) {
        throw new RoadmapCalculationError(
          `Nivel mínimo esperado duplicado para la dimensión '${m.dimension}'`,
          { dimension: m.dimension },
        );
      }
      DependencyGraph.assertLevelInRange(
        m.minimumExpectedLevel,
        `nivel mínimo esperado de '${m.dimension}'`,
      );
      byDimension.set(m.dimension, m.minimumExpectedLevel);
    }

    const missing = DIMENSION_CODES.filter((c) => !byDimension.has(c));
    if (missing.length > 0) {
      throw new RoadmapCalculationError(
        `Faltan levels mínimos esperados para: ${missing.join(', ')}. ` +
          `El roadmap necesita un mínimo declarado por cada una de las seis dimensiones.`,
        { missing },
      );
    }

    const seen = new Set<string>();
    for (const e of edges) {
      if (e.source === e.target) {
        throw new RoadmapCalculationError(
          `Arista reflexiva: '${e.source}' no puede depender de sí misma`,
          { dimension: e.source },
        );
      }
      const key = `${e.source}->${e.target}`;
      if (seen.has(key)) {
        throw new RoadmapCalculationError(`Arista duplicada: ${key}`, {
          edge: key,
        });
      }
      seen.add(key);
      DependencyGraph.assertLevelInRange(
        e.minimumRequiredLevel,
        `nivel requerido de la arista ${key}`,
      );
    }

    const incoming = new Map<DimensionCode, DependencyEdgeSnapshot[]>();
    const outgoing = new Map<DimensionCode, DependencyEdgeSnapshot[]>();
    for (const c of DIMENSION_CODES) {
      incoming.set(c, []);
      outgoing.set(c, []);
    }
    for (const e of edges) {
      incoming.get(e.target)?.push(e);
      outgoing.get(e.source)?.push(e);
    }

    DependencyGraph.assertAcyclic(edges);

    return new DependencyGraph(
      [...edges],
      byDimension,
      incoming,
      outgoing,
    );
  }

  /** Edges that reach `d`: the dimensions that enable it. */
  incomingEdges(d: DimensionCode): readonly DependencyEdgeSnapshot[] {
    return this.incoming.get(d) ?? [];
  }

  /** Edges that leave `d`: the dimensions it enables. */
  outgoingEdges(d: DimensionCode): readonly DependencyEdgeSnapshot[] {
    return this.outgoing.get(d) ?? [];
  }

  expectedMinimum(d: DimensionCode): number {
    const m = this.minimums.get(d);
    if (m === undefined) {
      throw new RoadmapCalculationError(
        `La dimensión '${d}' no tiene nivel mínimo esperado declarado`,
        { dimension: d },
      );
    }
    return m;
  }

  nodes(): readonly DimensionCode[] {
    return DIMENSION_CODES;
  }

  allEdges(): readonly DependencyEdgeSnapshot[] {
    return this.edges;
  }

  // ───────────────────────────────────────────────────────────────────────

  private static assertLevelInRange(level: number, what: string): void {
    if (!isValidIrlLevel(level)) {
      throw new RoadmapCalculationError(
        `El ${what} debe ser un entero en [${String(IRL_MIN_LEVEL)}, ${String(IRL_MAX_LEVEL)}]; se recibió ${String(level)}`,
        { received: level },
      );
    }
  }

  /**
   * Kahn over the whole graph, via the traversal shared with the layering
   * service. It throws `DependencyGraphCycleError` if any node is left over
   * once the free ones are exhausted; the layers it returns are not needed.
   */
  private static assertAcyclic(
    edges: readonly DependencyEdgeSnapshot[],
  ): void {
    kahnLayers(new Set<DimensionCode>(DIMENSION_CODES), edges);
  }
}
