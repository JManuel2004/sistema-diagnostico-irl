import { DIMENSION_CODES, type DimensionCode } from '@innlab/contracts';
import {
  DependencyGraphCycleError,
  RoadmapCalculationError,
} from '../errors/roadmap.errors.js';
import type {
  DependencyEdgeSnapshot,
  DimensionMinimumSnapshot,
} from '../ports/dependency-graph.repository.port.js';

/**
 * El grafo dirigido de dependencias entre dimensiones, ya validado.
 *
 * Objeto de valor inmutable con constructor privado y factoría estática,
 * el mismo patrón que `EscalaCalibracion` en el enrutador: si existe una
 * instancia, sus invariantes se cumplen, y ningún consumidor tiene que
 * volver a comprobarlas.
 *
 * Lo que se valida al construir:
 *   - las seis dimensiones tienen un mínimo esperado declarado;
 *   - ninguna arista es reflexiva ni está duplicada;
 *   - todos los niveles caen en [1, 9];
 *   - el grafo es acíclico.
 *
 * La aciclicidad se comprueba aquí y no solo en la base porque la base
 * no puede verla: `UNIQUE (origen, destino)` impide duplicados, no que
 * A→B→C→A cierre un lazo.
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
        m.nivelMinimoEsperado,
        `nivel mínimo esperado de '${m.dimension}'`,
      );
      porDimension.set(m.dimension, m.nivelMinimoEsperado);
    }

    const faltantes = DIMENSION_CODES.filter((c) => !porDimension.has(c));
    if (faltantes.length > 0) {
      throw new RoadmapCalculationError(
        `Faltan niveles mínimos esperados para: ${faltantes.join(', ')}. ` +
          `El roadmap necesita un mínimo declarado por cada una de las seis dimensiones.`,
        { faltantes },
      );
    }

    const vistas = new Set<string>();
    for (const e of edges) {
      if (e.origen === e.destino) {
        throw new RoadmapCalculationError(
          `Arista reflexiva: '${e.origen}' no puede depender de sí misma`,
          { dimension: e.origen },
        );
      }
      const clave = `${e.origen}->${e.destino}`;
      if (vistas.has(clave)) {
        throw new RoadmapCalculationError(`Arista duplicada: ${clave}`, {
          arista: clave,
        });
      }
      vistas.add(clave);
      DependencyGraph.assertNivelEnRango(
        e.nivelMinimoRequerido,
        `nivel requerido de la arista ${clave}`,
      );
    }

    const entrantes = new Map<DimensionCode, DependencyEdgeSnapshot[]>();
    const salientes = new Map<DimensionCode, DependencyEdgeSnapshot[]>();
    for (const c of DIMENSION_CODES) {
      entrantes.set(c, []);
      salientes.set(c, []);
    }
    for (const e of edges) {
      entrantes.get(e.destino)?.push(e);
      salientes.get(e.origen)?.push(e);
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
    if (!Number.isInteger(nivel) || nivel < 1 || nivel > 9) {
      throw new RoadmapCalculationError(
        `El ${que} debe ser un entero en [1, 9]; se recibió ${String(nivel)}`,
        { recibido: nivel },
      );
    }
  }

  /**
   * Kahn sobre el grafo completo. Si al agotar los nodos sin aristas
   * entrantes quedan nodos por procesar, esos nodos están en un ciclo o
   * dependen de uno.
   */
  private static assertAciclico(
    edges: readonly DependencyEdgeSnapshot[],
  ): void {
    const gradoEntrada = new Map<DimensionCode, number>(
      DIMENSION_CODES.map((c) => [c, 0]),
    );
    for (const e of edges) {
      gradoEntrada.set(e.destino, (gradoEntrada.get(e.destino) ?? 0) + 1);
    }

    const restantes = new Set<DimensionCode>(DIMENSION_CODES);
    let progreso = true;
    while (restantes.size > 0 && progreso) {
      const listos = [...restantes].filter((d) => gradoEntrada.get(d) === 0);
      progreso = listos.length > 0;
      for (const d of listos) {
        restantes.delete(d);
        for (const e of edges) {
          if (e.origen === d && restantes.has(e.destino)) {
            gradoEntrada.set(e.destino, (gradoEntrada.get(e.destino) ?? 1) - 1);
          }
        }
      }
    }

    if (restantes.size > 0) {
      throw new DependencyGraphCycleError([...restantes]);
    }
  }
}
