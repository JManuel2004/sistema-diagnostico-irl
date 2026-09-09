import { DIMENSION_CODES, type DimensionCode } from '@innlab/contracts';
import type { DependencyGraph } from '../value-objects/dependency-graph.vo.js';
import { DependencyGraphCycleError } from '../errors/roadmap.errors.js';

/**
 * Ordena en capas las dimensiones a intervenir.
 *
 * Kahn por capas sobre el **subgrafo inducido** por la cerradura: las
 * aristas cuyo origen o destino queda fuera del conjunto se ignoran, no
 * se arrastran. Sin esa restricción, una dependencia de una dimensión
 * que ya cumple su mínimo bloquearía indefinidamente a la que sí hay que
 * intervenir.
 *
 * Las dimensiones de una misma capa **se trabajan en paralelo**: no hay
 * dependencia entre ellas. El orden dentro de la capa es el canónico del
 * marco, y existe solo para que el resultado sea determinista y los
 * tests reproducibles. No es una prioridad, y quien lo renderice como
 * lista numerada estará comunicando una jerarquía que el sistema no
 * calculó.
 *
 * Servicio de dominio puro.
 */
export class TopologicalLayeringService {
  layer(
    cerradura: ReadonlySet<DimensionCode>,
    grafo: DependencyGraph,
  ): DimensionCode[][] {
    const restantes = new Set(cerradura);

    // Solo aristas internas al subgrafo inducido.
    const aristasInternas = grafo
      .allEdges()
      .filter((e) => cerradura.has(e.origen) && cerradura.has(e.destino));

    const gradoEntrada = new Map<DimensionCode, number>(
      [...cerradura].map((d) => [d, 0]),
    );
    for (const e of aristasInternas) {
      // `destino` está en la cerradura por el filtro de arriba, así que la
      // clave existe: no hay caso de ausencia que contemplar.
      gradoEntrada.set(e.destino, gradoEntrada.get(e.destino)! + 1);
    }

    const capas: DimensionCode[][] = [];

    while (restantes.size > 0) {
      const capa = [...restantes].filter((d) => gradoEntrada.get(d) === 0);

      if (capa.length === 0) {
        // Red de seguridad. `DependencyGraph.create()` ya rechazó los
        // ciclos, así que llegar aquí significa que algo dejó pasar uno;
        // fallar con los nodos implicados es preferible a devolver un
        // roadmap incompleto que parecería correcto.
        throw new DependencyGraphCycleError([...restantes]);
      }

      capa.sort(
        (a, b) => DIMENSION_CODES.indexOf(a) - DIMENSION_CODES.indexOf(b),
      );
      capas.push(capa);

      for (const d of capa) restantes.delete(d);
      for (const e of aristasInternas) {
        if (capa.includes(e.origen) && restantes.has(e.destino)) {
          gradoEntrada.set(e.destino, gradoEntrada.get(e.destino)! - 1);
        }
      }
    }

    return capas;
  }
}
