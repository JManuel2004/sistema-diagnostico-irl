import type { DimensionCode } from '@innlab/contracts';
import type { DependencyGraph } from '../value-objects/dependency-graph.vo.js';

/**
 * Determina qué dimensiones hay que intervenir.
 *
 * Servicio de dominio puro: sin IO, sin decoradores, sin framework.
 *
 * Arranca del **foco** —las dimensiones por debajo de su mínimo
 * esperado— y lo cierra hacia atrás: si una dimensión del conjunto tiene
 * un habilitador que no llega al nivel que esa arista exige, el
 * habilitador también entra, porque de nada sirve empujar una dimensión
 * cuyo prerrequisito sigue corto.
 *
 * ── Punto fijo, no una sola pasada ──────────────────────────────────
 *
 * El cierre se calcula con lista de trabajo hasta que no entren nodos
 * nuevos, y esto es una corrección deliberada respecto del diseño
 * original del enfoque, que hacía una única pasada sobre el foco. Una
 * sola pasada es incorrecta en el caso general: si se incorpora un
 * habilitador `u` y `u` a su vez tiene un habilitador insuficiente `t`,
 * `t` nunca entraría y el orden de fases saldría incompleto —sin que
 * nada fallara de forma visible.
 *
 * Con el grafo sembrado y el perfil de AgroConecta ambas versiones
 * coinciden (el cierre es igual al foco), así que la corrección no
 * cambia ese caso; evita un fallo latente frente a otros perfiles.
 *
 * Termina siempre: cada dimensión entra a la cola a lo sumo una vez y
 * hay seis.
 */
export class RoadmapClosureService {
  compute(
    niveles: ReadonlyMap<DimensionCode, number>,
    grafo: DependencyGraph,
  ): Set<DimensionCode> {
    const cerradura = new Set<DimensionCode>();
    const porRevisar: DimensionCode[] = [];

    for (const d of grafo.nodes()) {
      const nivel = niveles.get(d);
      if (nivel !== undefined && nivel < grafo.expectedMinimum(d)) {
        cerradura.add(d);
        porRevisar.push(d);
      }
    }

    while (porRevisar.length > 0) {
      const destino = porRevisar.shift()!;
      for (const arista of grafo.incomingEdges(destino)) {
        const nivelOrigen = niveles.get(arista.origen);
        if (nivelOrigen === undefined) continue;
        if (
          nivelOrigen < arista.nivelMinimoRequerido &&
          !cerradura.has(arista.origen)
        ) {
          cerradura.add(arista.origen);
          // El habilitador también necesita que se revisen SUS
          // habilitadores: esto es lo que una sola pasada perdería.
          porRevisar.push(arista.origen);
        }
      }
    }

    return cerradura;
  }
}
