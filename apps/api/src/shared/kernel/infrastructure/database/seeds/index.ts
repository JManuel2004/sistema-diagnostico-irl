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
 * Every write is an upsert on a natural key (see `seed-catalog.ts`), so it
 * can run any number of times; content already in use by transactional
 * rows (a framework version, a consent text) is never rewritten.
 */
async function run(): Promise<void> {
  await dataSource.initialize();
  let routing = { services: 0 };
  let roadmap = { edges: 0 };
  try {
    await dataSource.transaction(async (manager) => {
      ({ routing, roadmap } = await seedCatalog(manager));
    });

    const count = async (table: string): Promise<string> => {
      const [{ count: n }] = await dataSource.query<{ count: string }[]>(
        `SELECT COUNT(*)::text AS count FROM irl_catalog.${table}`,
      );
      return n;
    };

    // eslint-disable-next-line no-console
    console.log(
      `Seed complete — ${await count('framework_version')} framework versions, ` +
        `${await count('dimension')} dimensions, ${await count('statement')} statements, ` +
        `${await count('conversion_range')} conversion ranges, ${await count('dimension_pair')} ` +
        `dimension pairs, ${await count('consent_terms')} consent texts, ${String(routing.services)} ` +
        `portfolio services, ${String(roadmap.edges)} roadmap dependency edges in irl_catalog.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
