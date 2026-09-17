import type { EntityManager } from 'typeorm';
import { DIMENSION_DEPENDENCIES } from './data/dimension-dependencies.js';

/**
 * Seeds the dependency graph between dimensions (RF-14).
 *
 * The FKs are resolved by subquery on `code`, not by literal id:
 * `dimension.id_dimension` is IDENTITY and its value is not stable
 * across environments. Same pattern the `statement` seed uses.
 *
 * Idempotent by the natural key `(source, target)`. The `DO UPDATE`
 * lists the two mutable columns explicitly — omitting one would make
 * the seed look idempotent while never updating that value after the
 * first INSERT, which is exactly the shape of the bug that
 * `dimension_result.is_bottleneck` carries.
 *
 * The expected minimum level per dimension is seeded in the `dimension`
 * step, not here: it is a column of that table.
 */
export async function seedRoadmapGraph(
  manager: EntityManager,
): Promise<{ edges: number }> {
  for (const edge of DIMENSION_DEPENDENCIES) {
    await manager.query(
      `INSERT INTO irl_catalog.dimension_dependency
         (id_dimension_source, id_dimension_target, minimum_required_level, is_active)
       SELECT o.id_dimension, d.id_dimension, $3, true
         FROM irl_catalog.dimension o, irl_catalog.dimension d
        WHERE o.code = $1 AND d.code = $2
       ON CONFLICT (id_dimension_source, id_dimension_target) DO UPDATE
         SET minimum_required_level = EXCLUDED.minimum_required_level,
             is_active              = EXCLUDED.is_active`,
      [edge.source, edge.target, edge.minimumRequiredLevel],
    );
  }
  return { edges: DIMENSION_DEPENDENCIES.length };
}
