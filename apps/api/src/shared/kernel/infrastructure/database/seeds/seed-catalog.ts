import type { EntityManager } from 'typeorm';
import { CONVERSION_RANGES } from './data/conversion-ranges.js';
import { DIMENSIONS } from './data/dimensions.js';
import { SECTORS } from './data/sectors.js';
import { STATEMENTS } from './data/statements.js';
import { seedRouting } from './seed-routing.js';
import { seedRoadmapGraph } from './seed-roadmap-graph.js';

/**
 * Seeds the whole catalog inside the caller's transaction.
 *
 * Idempotent: every write is an `ON CONFLICT` upsert on a natural key, so it
 * can run any number of times. Separated from `index.ts` (the CLI, which owns
 * the connection and the `.env` loading) so the integration tests run the
 * same seed the `db:seed` command runs.
 *
 * The routing configuration goes in the same transaction: a configuration with
 * profiles but no exception rules would make the engine start and give
 * silently incomplete results. The roadmap graph goes after `dimension`
 * because it resolves its foreign keys by subquery on `code`.
 */
export async function seedCatalog(manager: EntityManager): Promise<{
  routing: { configurationSeeded: boolean };
  roadmap: { edges: number };
}> {
  let routing = { configurationSeeded: false };
  let roadmap = { edges: 0 };
  for (const d of DIMENSIONS) {
    await manager.query(
      `INSERT INTO irl_catalog.dimension
         (code, name_es, name_en, short_name_es, description, is_critical_dimension,
          sequence, minimum_expected_level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (code) DO UPDATE
         SET name_es                = EXCLUDED.name_es,
             name_en                = EXCLUDED.name_en,
             short_name_es          = EXCLUDED.short_name_es,
             description            = EXCLUDED.description,
             is_critical_dimension  = EXCLUDED.is_critical_dimension,
             sequence               = EXCLUDED.sequence,
             minimum_expected_level = EXCLUDED.minimum_expected_level`,
      [
        d.code,
        d.nameEs,
        d.nameEn,
        d.shortNameEs,
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

  // Sector catalog. `sector` has no natural unique key, so each name is
  // inserted only when it is not there yet.
  for (const name of SECTORS) {
    await manager.query(
      `INSERT INTO irl_catalog.sector (name, is_active)
       SELECT $1::varchar, true
       WHERE NOT EXISTS (SELECT 1 FROM irl_catalog.sector WHERE name = $1::varchar)`,
      [name],
    );
  }

  await manager.query(
    `INSERT INTO irl_diagnostic.diagnostic
       (id, cognito_user_id, state, irl_framework_version)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE
       SET state = EXCLUDED.state`,
    [
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      'usuario-demo',
      'QUESTIONNAIRE_IN_PROGRESS',
      'KTH-IRL-1.0',
    ],
  );

  // Routing catalog. It runs inside the same transaction: a
  // configuration with profiles but without exception rules would let
  // the engine start and give silently incomplete results.
  routing = await seedRouting(manager);

  // Dependency graph of the roadmap. It runs after `dimension`
  // because it resolves its FKs by subquery on `code`.
  roadmap = await seedRoadmapGraph(manager);

  return { routing, roadmap };
}
