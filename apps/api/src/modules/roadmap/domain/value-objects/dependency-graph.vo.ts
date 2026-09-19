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
    private readonly entrantes: ReadonlyMap<DimensionCode, readonly DependencyEdgeSnapshot[]>,
    private readonly salientes: ReadonlyMap<DimensionCode, readonly DependencyEdgeSnapshot[]>,
  ) {}

  static create(
    edges: readonly DependencyEdgeSnapshot[],
    minimums: readonly DimensionMinimumSnapshot[],
  ): DependencyGraph {
    const porDimension = new Map<DimensionCode, number>();
    for (const m of minimums) {
      if (porDimension.has(m.dimension)) {
        throw new RoadmapCalculationError(
          `Nivel mínimo esperado duplicado para la dimensión '${m.dimension}'`,
          { dimension: m.dimension },
        );
      }
      DependencyGraph.assertNivelEnRango(
        m.minimumExpectedLevel,
        `nivel mínimo esperado de '${m.dimension}'`,
      );
      porDimension.set(m.dimension, m.minimumExpectedLevel);
    }

    const faltantes = DIMENSION_CODES.filter((c) => !porDimension.has(c));
    if (faltantes.length > 0) {
      throw new RoadmapCalculationError(
        `Faltan levels mínimos esperados para: ${faltantes.join(', ')}. ` +
          `El roadmap necesita un mínimo declarado por cada una de las seis dimensions.`,
        { faltantes },
      );
    }

    const vistas = new Set<string>();
    for (const e of edges) {
      if (e.source === e.target) {
        throw new RoadmapCalculationError(
          `Arista reflexiva: '${e.source}' no puede depender de sí misma`,
          { dimension: e.source },
        );
      }
      const clave = `${e.source}->${e.target}`;
      if (vistas.has(clave)) {
        throw new RoadmapCalculationError(`Arista duplicada: ${clave}`, {
          edge: clave,
        });
      }
      vistas.add(clave);
      DependencyGraph.assertNivelEnRango(
        e.minimumRequiredLevel,
        `nivel requerido de la edge ${clave}`,
      );
    }

    const entrantes = new Map<DimensionCode, DependencyEdgeSnapshot[]>();
    const salientes = new Map<DimensionCode, DependencyEdgeSnapshot[]>();
    for (const c of DIMENSION_CODES) {
      entrantes.set(c, []);
      salientes.set(c, []);
    }
    for (const e of edges) {
      entrantes.get(e.target)?.push(e);
      salientes.get(e.source)?.push(e);
    }

    DependencyGraph.assertAciclico(edges);

    return new DependencyGraph(
      [...edges],
      porDimension,
      entrantes,
      salientes,
    );
  }

  /** Aristas que llegan a `d`: quiénes la habilitan. */
  incomingEdges(d: DimensionCode): readonly DependencyEdgeSnapshot[] {
    return this.entrantes.get(d) ?? [];
  }

  /** Aristas que salen de `d`: a quiénes habilita. */
  outgoingEdges(d: DimensionCode): readonly DependencyEdgeSnapshot[] {
    return this.salientes.get(d) ?? [];
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

  private static assertNivelEnRango(nivel: number, que: string): void {
    if (!isValidIrlLevel(nivel)) {
      throw new RoadmapCalculationError(
        `El ${que} debe ser un entero en [${String(IRL_MIN_LEVEL)}, ${String(IRL_MAX_LEVEL)}]; se recibió ${String(nivel)}`,
        { recibido: nivel },
      );
    }
  }

  /**
   * Kahn over the whole graph, via the traversal shared with the layering
   * service. It throws `DependencyGraphCycleError` if any node is left over
   * once the free ones are exhausted; the layers it returns are not needed.
   */
  private static assertAciclico(
    edges: readonly DependencyEdgeSnapshot[],
  ): void {
    kahnLayers(new Set<DimensionCode>(DIMENSION_CODES), edges);
  }
}
