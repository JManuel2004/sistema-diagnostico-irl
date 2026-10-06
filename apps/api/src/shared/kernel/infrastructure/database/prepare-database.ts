import { DataSource } from 'typeorm';
import { InitialSchema1747526400001 } from './migrations/20260518001-InitialSchema.js';
import { seedCatalog } from './seeds/seed-catalog.js';

interface SchemaFingerprint {
  has_schema: boolean;
  has_dimension_code: boolean;
  has_service_tier: boolean;
  has_cognito_user_id: boolean;
}

/** True when a previous schema is present but it is not the current one. */
async function schemaIsStale(dataSource: DataSource): Promise<boolean> {
  const [row] = await dataSource.query<SchemaFingerprint[]>(
    `SELECT
       EXISTS (
         SELECT 1 FROM information_schema.schemata
         WHERE schema_name IN ('irl_catalog', 'irl_diagnostic')
       ) AS has_schema,
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'irl_catalog'
           AND table_name = 'dimension'
           AND column_name = 'code'
       ) AS has_dimension_code,
       EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'irl_catalog'
           AND table_name = 'service_tier'
       ) AS has_service_tier,
       EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'irl_diagnostic'
           AND table_name = 'initiative'
           AND column_name = 'cognito_user_id'
       ) AS has_cognito_user_id`,
  );
  if (!row.has_schema) {
    return false;
  }
  return !row.has_dimension_code || !row.has_service_tier || !row.has_cognito_user_id;
}

/**
 * Applies the schema and the IRL catalog before the API accepts traffic.
 *
 * Production on Render has no Shell on the free plan, and the process
 * starts with `migrationsRun: false`. The single migration is edited in
 * place while no environment holds real data. A database that already
 * recorded `InitialSchema1747526400001` keeps the old tables, so the
 * seed then fails (Render: `dimension.code` does not exist). When the
 * live shape is not the one this migration creates, both schemas are
 * dropped and the migration runs again. A database that already matches
 * is left in place; the seed only upserts catalog rows.
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
    if (await schemaIsStale(dataSource)) {
      console.warn(
        'Database schema does not match InitialSchema1747526400001. Dropping irl_catalog and irl_diagnostic and applying the current migration.',
      );
      await dataSource.query('DROP SCHEMA IF EXISTS irl_diagnostic CASCADE');
      await dataSource.query('DROP SCHEMA IF EXISTS irl_catalog CASCADE');
      await dataSource.query('DROP TABLE IF EXISTS public.typeorm_migrations');
    }
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
