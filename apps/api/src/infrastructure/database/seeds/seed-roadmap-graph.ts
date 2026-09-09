import type { EntityManager } from 'typeorm';
import { DIMENSION_DEPENDENCIES } from './data/dimension-dependencies.js';

/**
 * Siembra el grafo de dependencias entre dimensiones (RF-14).
 *
 * Las FKs se resuelven por subconsulta sobre `codigo`, no por id
 * literal: `dimension.id_dimension` es IDENTITY y su valor no es estable
 * entre entornos. Es el mismo patrón que usa la siembra de `afirmacion`.
 *
 * Idempotente por la clave natural `(origen, destino)`. El `DO UPDATE`
 * lista explícitamente las dos columnas mutables — omitir una haría que
 * el seed pareciera idempotente pero nunca actualizara ese valor tras el
 * primer INSERT, que es exactamente la forma del bug que arrastra
 * `resultado_dimension.es_cuello_botella`.
 *
 * El nivel mínimo esperado por dimensión se siembra en el paso de
 * `dimension`, no aquí: es una columna de esa tabla.
 */
export async function seedRoadmapGraph(
  manager: EntityManager,
): Promise<{ aristas: number }> {
  for (const arista of DIMENSION_DEPENDENCIES) {
    await manager.query(
      `INSERT INTO irl_catalog.dependencia_dimension
         (id_dimension_origen, id_dimension_destino, nivel_minimo_requerido, activa)
       SELECT o.id_dimension, d.id_dimension, $3, true
         FROM irl_catalog.dimension o, irl_catalog.dimension d
        WHERE o.codigo = $1 AND d.codigo = $2
       ON CONFLICT (id_dimension_origen, id_dimension_destino) DO UPDATE
         SET nivel_minimo_requerido = EXCLUDED.nivel_minimo_requerido,
             activa                 = EXCLUDED.activa`,
      [arista.origen, arista.destino, arista.nivelMinimoRequerido],
    );
  }
  return { aristas: DIMENSION_DEPENDENCIES.length };
}
