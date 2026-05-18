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
 *   - `dimension (codigo, version_marco)`
 *   - `afirmacion (id_dimension, orden, version_marco)`
 *
 * Re-running the seed updates text content but never duplicates rows.
 */
async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      for (const d of DIMENSIONS) {
        await manager.query(
          `INSERT INTO irl_catalog.dimension (id_dimension, codigo, nombre, descripcion, orden)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (codigo, version_marco) DO UPDATE
               SET nombre = EXCLUDED.nombre,
                   descripcion = EXCLUDED.descripcion,
                   orden = EXCLUDED.orden`,
          [d.id, d.codigo, d.nombre, d.descripcion, d.orden],
        );
      }

      for (const s of STATEMENTS) {
        await manager.query(
          `INSERT INTO irl_catalog.afirmacion (id_afirmacion, id_dimension, orden, texto)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id_dimension, orden, version_marco) DO UPDATE
               SET texto = EXCLUDED.texto`,
          [s.id, s.dimensionId, s.orden, s.texto],
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
