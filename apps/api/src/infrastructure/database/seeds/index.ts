import { config as loadEnv } from 'dotenv';
import dataSource from '../data-source.js';
import { DIMENSIONS } from './data/dimensions.js';
import { STATEMENTS } from './data/statements.js';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

/**
 * Idempotent catalog seeder.
 *
 * Run with: `pnpm --filter @innlab/api db:seed`
 *
 * Idempotency strategy: UPSERT using `ON CONFLICT` on the natural unique
 * keys declared in the migration:
 *   - `dimension`: UNIQUE (codigo)
 *   - `afirmacion`: UNIQUE (id_dimension, numero_en_dimension)
 *
 * Both tables use GENERATED ALWAYS AS IDENTITY PKs — never include
 * id_dimension or id_afirmacion in INSERT statements.
 *
 * Statements are linked to dimensions by a subquery on codigo so the
 * seed is order-independent and does not hard-code integer FKs.
 */
async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      for (const d of DIMENSIONS) {
        await manager.query(
          `INSERT INTO irl_catalog.dimension
             (codigo, nombre_es, nombre_en, descripcion, es_dimension_critica, orden)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (codigo) DO UPDATE
             SET nombre_es            = EXCLUDED.nombre_es,
                 nombre_en            = EXCLUDED.nombre_en,
                 descripcion          = EXCLUDED.descripcion,
                 es_dimension_critica = EXCLUDED.es_dimension_critica,
                 orden                = EXCLUDED.orden`,
          [
            d.codigo,
            d.nombreEs,
            d.nombreEn,
            d.descripcion,
            d.esDimensionCritica,
            d.orden,
          ],
        );
      }

      for (const s of STATEMENTS) {
        await manager.query(
          `INSERT INTO irl_catalog.afirmacion (id_dimension, numero_en_dimension, texto_es)
           SELECT d.id_dimension, $2, $3
             FROM irl_catalog.dimension d
            WHERE d.codigo = $1
           ON CONFLICT (id_dimension, numero_en_dimension) DO UPDATE
             SET texto_es = EXCLUDED.texto_es`,
          [s.dimensionCodigo, s.numeroenDimension, s.textoEs],
        );
      }
    });

    const [{ count: dimCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.dimension`,
    );
    const [{ count: afCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.afirmacion`,
    );

    // eslint-disable-next-line no-console
    console.log(
      `Seed complete — ${dimCount} dimensions, ${afCount} statements in irl_catalog`,
    );
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
