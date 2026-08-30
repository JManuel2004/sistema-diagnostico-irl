import { config as loadEnv } from 'dotenv';
import dataSource from '../data-source.js';
import { CONVERSION_RANGES } from './data/conversion-ranges.js';
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
 *   - `rango_conversion`: PRIMARY KEY (nivel_irl)
 *
 * `dimension` and `afirmacion` use GENERATED ALWAYS AS IDENTITY PKs —
 * never include their PKs in INSERT statements. `rango_conversion` has
 * `nivel_irl` as the natural PK and IS included explicitly per row.
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

      for (const r of CONVERSION_RANGES) {
        await manager.query(
          `INSERT INTO irl_catalog.rango_conversion (nivel_irl, avg_min, avg_max)
           VALUES ($1, $2, $3)
           ON CONFLICT (nivel_irl) DO UPDATE
             SET avg_min = EXCLUDED.avg_min,
                 avg_max = EXCLUDED.avg_max`,
          [r.nivelIrl, r.avgMin, r.avgMax],
        );
      }

      const PAIRS: Array<[string, string]> = [
        ['TRL', 'CRL'],
        ['TRL', 'BRL'],
        ['CRL', 'BRL'],
        ['TmRL', 'FRL'],
        ['BRL', 'IPRL'],
        ['TRL', 'IPRL'],
      ];
      for (const [a, b] of PAIRS) {
        await manager.query(
          `INSERT INTO irl_catalog.par_dimension (id_dimension_a, id_dimension_b, codigo_par)
           SELECT da.id_dimension, db.id_dimension, $3
             FROM irl_catalog.dimension da, irl_catalog.dimension db
            WHERE da.codigo = $1 AND db.codigo = $2
           ON CONFLICT (codigo_par) DO NOTHING`,
          [a, b, `${a}-${b}`],
        );
      }

      await manager.query(
        `INSERT INTO irl_diagnostic.diagnostico
           (id_diagnostico, keycloak_user_id, estado, version_marco_irl)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id_diagnostico) DO UPDATE
           SET estado = EXCLUDED.estado`,
        [
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          'usuario-demo',
          'CUESTIONARIO_EN_CURSO',
          'KTH-IRL-1.0',
        ],
      );
    });

    const [{ count: dimCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.dimension`,
    );
    const [{ count: afCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.afirmacion`,
    );
    const [{ count: rcCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.rango_conversion`,
    );
    const [{ count: parCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.par_dimension`,
    );

    // eslint-disable-next-line no-console
    console.log(
      `Seed complete — ${dimCount} dimensions, ${afCount} statements, ${rcCount} conversion ranges, ${parCount} dimension pairs in irl_catalog`,
    );
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
