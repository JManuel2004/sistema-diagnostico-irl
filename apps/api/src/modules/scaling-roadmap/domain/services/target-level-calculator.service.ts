import type { DimensionCode } from '@innlab/contracts';
import type { DependencyGraph } from '../value-objects/dependency-graph.vo.js';

/**
 * Calcula a qué nivel hay que llevar cada dimensión de la cerradura.
 *
 *   meta[d] = max( mínimo esperado de d,
 *                  la mayor exigencia de sus sucesores dentro de la cerradura )
 *
 * El segundo término es lo que distingue este cálculo de "subir todo al
 * mínimo": si una dimensión habilita a otra que sí hay que intervenir, y
 * esa arista exige un nivel superior a su propio mínimo, la meta sube
 * hasta lo que la arista pide. Llevarla solo hasta su mínimo dejaría la
 * dependencia sin satisfacer y la fase siguiente sin efecto.
 *
 * Solo se miran sucesores **dentro** de la cerradura: exigir un nivel
 * por una dimensión que ya está sana sería trabajo sin destinatario.
 *
 * Invariante: `meta[d] > nivel[d]` para toda `d` de la cerradura. Se
 * cumple por construcción —una dimensión entra o por estar bajo su
 * mínimo, o por estar bajo lo que le exige un sucesor— y su violación
 * indicaría un error en el cierre, no aquí.
 *
 * Servicio de dominio puro.
 */
export class TargetLevelCalculatorService {
  compute(
    cerradura: ReadonlySet<DimensionCode>,
    grafo: DependencyGraph,
  ): Map<DimensionCode, number> {
    const metas = new Map<DimensionCode, number>();

    for (const d of cerradura) {
      const exigencias = grafo
        .outgoingEdges(d)
        .filter((e) => cerradura.has(e.destino))
        .map((e) => e.nivelMinimoRequerido);

      const exigenciaSucesores =
        exigencias.length > 0 ? Math.max(...exigencias) : 0;

      metas.set(d, Math.max(grafo.expectedMinimum(d), exigenciaSucesores));
    }

    return metas;
  }
}
