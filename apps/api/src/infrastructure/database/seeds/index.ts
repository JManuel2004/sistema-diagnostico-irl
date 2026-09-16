import { config as loadEnv } from 'dotenv';
import dataSource from '../data-source.js';
import { CONVERSION_RANGES } from './data/conversion-ranges.js';
import { DIMENSIONS } from './data/dimensions.js';
import { STATEMENTS } from './data/statements.js';
import { seedPortfolioRouting } from './seed-portfolio-routing.js';
import { seedRoadmapGraph } from './seed-roadmap-graph.js';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

/**
 * Idempotent catalog seeder.
 *
 * Run with: `pnpm --filter @innlab/api db:seed`
 *
 * Idempotency strategy: UPSERT using `ON CONFLICT` on the natural unique
 * keys declared in the migration:
 *   - `dimension`: UNIQUE (code)
 *   - `statement`: UNIQUE (id_dimension, sequence)
 *   - `conversion_range`: PRIMARY KEY (irl_level)
 *
 * `dimension` and `statement` use GENERATED ALWAYS AS IDENTITY PKs —
 * never include their PKs in INSERT statements. `conversion_range` has
 * `irl_level` as the natural PK and IS included explicitly per row.
 *
 * Statements are linked to dimensions by a subquery on code so the
 * seed is order-independent and does not hard-code integer FKs.
 */
async function run(): Promise<void> {
  await dataSource.initialize();
  let routing = { versionPublicada: false };
  let roadmap = { aristas: 0 };
  try {
    await dataSource.transaction(async (manager) => {
      for (const d of DIMENSIONS) {
        await manager.query(
          `INSERT INTO irl_catalog.dimension
             (code, name_es, name_en, description, is_critical_dimension, sequence,
              minimum_expected_level)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (code) DO UPDATE
             SET name_es                = EXCLUDED.name_es,
                 name_en                = EXCLUDED.name_en,
                 description            = EXCLUDED.description,
                 is_critical_dimension  = EXCLUDED.is_critical_dimension,
                 sequence               = EXCLUDED.sequence,
                 minimum_expected_level = EXCLUDED.minimum_expected_level`,
          [
            d.code,
            d.nameEs,
            d.nameEn,
            d.description,
            d.isCriticalDimension,
            d.sequence,
            d.minimumExpectedLevel,
          ],
        );
      }

      for (const s of STATEMENTS) {
        await manager.query(
          `INSERT INTO irl_catalog.statement (id_dimension, sequence, text_es)
           SELECT d.id_dimension, $2, $3
             FROM irl_catalog.dimension d
            WHERE d.code = $1
           ON CONFLICT (id_dimension, sequence) DO UPDATE
             SET text_es = EXCLUDED.text_es`,
          [s.dimensionCode, s.sequence, s.textEs],
        );
      }

      for (const r of CONVERSION_RANGES) {
        await manager.query(
          `INSERT INTO irl_catalog.conversion_range (irl_level, avg_min, avg_max)
           VALUES ($1, $2, $3)
           ON CONFLICT (irl_level) DO UPDATE
             SET avg_min = EXCLUDED.avg_min,
                 avg_max = EXCLUDED.avg_max`,
          [r.irlLevel, r.avgMin, r.avgMax],
        );
      }

      const PAIRS: [string, string][] = [
        ['TRL', 'CRL'],
        ['TRL', 'BRL'],
        ['CRL', 'BRL'],
        ['TmRL', 'FRL'],
        ['BRL', 'IPRL'],
        ['TRL', 'IPRL'],
      ];
      for (const [a, b] of PAIRS) {
        await manager.query(
          `INSERT INTO irl_catalog.dimension_pair (id_dimension_a, id_dimension_b, pair_code)
           SELECT da.id_dimension, db.id_dimension, $3
             FROM irl_catalog.dimension da, irl_catalog.dimension db
            WHERE da.code = $1 AND db.code = $2
           ON CONFLICT (pair_code) DO NOTHING`,
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

      // Catálogo de enrutamiento + publicación de la versión 1. Va dentro
      // de la misma transacción: una versión con fichas pero sin reglas de
      // excepción haría que el motor arrancase y diera resultados
      // silenciosamente incompletos.
      routing = await seedPortfolioRouting(manager);

      // Grafo de dependencias del roadmap. Va después de `dimension`
      // porque resuelve sus FKs por subconsulta sobre `code`.
      roadmap = await seedRoadmapGraph(manager);
    });

    const [{ count: dimCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.dimension`,
    );
    const [{ count: afCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.statement`,
    );
    const [{ count: rcCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.conversion_range`,
    );
    const [{ count: parCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.dimension_pair`,
    );

    const [{ count: svcCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.servicio_portafolio`,
    );
    const [{ count: fichaCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.ficha_ordinal_publicada`,
    );

    // eslint-disable-next-line no-console
    console.log(
      `Seed complete — ${dimCount} dimensions, ${afCount} statements, ${rcCount} conversion ranges, ` +
        `${parCount} dimension pairs, ${svcCount} portfolio services, ${fichaCount} ordinal profiles, ` +
        `${roadmap.aristas} roadmap dependency edges in irl_catalog. Routing configuration v1: ` +
        `${routing.versionPublicada ? 'published' : 'already present, left untouched'}.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
