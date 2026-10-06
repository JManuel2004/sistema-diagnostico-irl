import { DataSource } from 'typeorm';
import { InitialSchema1747526400001 } from './migrations/20260518001-InitialSchema.js';
import { seedCatalog } from './seeds/seed-catalog.js';

/**
 * Applies the schema and the IRL catalog before the API accepts traffic.
 *
 * Production on Render has no Shell on the free plan, and the process
 * starts with `migrationsRun: false`, so an empty database boots and
 * then fails the panel query. This uses the same migration class and
 * the same idempotent seed as the CLI. A database that already ran
 * them is left as it is; the seed only upserts catalog rows.
 */
export async function prepareDatabase(url: string): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    url,
    synchronize: false,
    migrations: [InitialSchema1747526400001],
    migrationsTableName: 'typeorm_migrations',
  });

  await dataSource.initialize();
  try {
    const applied = await dataSource.runMigrations();
    const seeded = await dataSource.transaction((manager) => seedCatalog(manager));
    console.warn(
      `Database ready — ${String(applied.length)} migration(s) applied, ` +
        `${String(seeded.routing.services)} portfolio services, ` +
        `${String(seeded.roadmap.edges)} roadmap edges.`,
    );
  } finally {
    await dataSource.destroy();
  }
}
