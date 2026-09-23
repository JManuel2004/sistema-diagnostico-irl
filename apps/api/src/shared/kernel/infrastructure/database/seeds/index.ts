import { config as loadEnv } from 'dotenv';
import dataSource from '../data-source.js';
import { seedCatalog } from './seed-catalog.js';

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
  let routing = { configurationSeeded: false };
  let roadmap = { edges: 0 };
  try {
    await dataSource.transaction(async (manager) => {
      ({ routing, roadmap } = await seedCatalog(manager));
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
    const [{ count: pairCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.dimension_pair`,
    );

    const [{ count: svcCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.portfolio_service`,
    );
    const [{ count: profileCount }] = await dataSource.query<
      { count: string }[]
    >(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.published_ordinal_profile`,
    );

    // eslint-disable-next-line no-console
    console.log(
      `Seed complete — ${dimCount} dimensions, ${afCount} statements, ${rcCount} conversion ranges, ` +
        `${pairCount} dimension pairs, ${svcCount} portfolio services, ${profileCount} ordinal profiles, ` +
        `${roadmap.edges} roadmap dependency edges in irl_catalog. Routing configuration: ` +
        `${routing.configurationSeeded ? 'seeded' : 'already present, left untouched'}.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
