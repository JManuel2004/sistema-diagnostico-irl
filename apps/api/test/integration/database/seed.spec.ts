import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { InitialSchema1747526400001 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518001-InitialSchema.js';
import { seedCatalog } from '../../../src/shared/kernel/infrastructure/database/seeds/seed-catalog.js';
import { DIMENSIONS } from '../../../src/shared/kernel/infrastructure/database/seeds/data/dimensions.js';
import { STATEMENTS } from '../../../src/shared/kernel/infrastructure/database/seeds/data/statements.js';

/**
 * Smoke test for the migration + seed pipeline.
 *
 * Boots a disposable Postgres via Testcontainers, applies the schema
 * migration (the project has a single one), runs the same `seedCatalog` the
 * `db:seed` command runs, and asserts the catalog is populated as the
 * framework demands: 6 dimensions, 48 statements, and RF-13's critical
 * dimensions marked.
 *
 * Also re-runs the seed to confirm idempotency — no duplicate rows.
 */
describe('Catalog seed (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();

    dataSource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      migrations: [InitialSchema1747526400001],
      migrationsTableName: 'typeorm_migrations',
    });

    await dataSource.initialize();
    await dataSource.runMigrations();
  }, 60_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    await container?.stop();
  });

  const runSeed = async (): Promise<void> => {
    await dataSource.transaction((manager) => seedCatalog(manager));
  };

  const count = async (table: string): Promise<string> => {
    const [{ count: n }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM ${table}`,
    );
    return n;
  };

  it('populates the catalog after a single run', async () => {
    await runSeed();

    expect(await count('irl_catalog.dimension')).toBe(
      String(DIMENSIONS.length),
    );
    expect(await count('irl_catalog.statement')).toBe(
      String(STATEMENTS.length),
    );
    expect(await count('irl_catalog.dimension')).toBe('6');
    expect(await count('irl_catalog.statement')).toBe('48');
    expect(await count('irl_catalog.dimension_pair')).toBe('6');
    expect(await count('irl_catalog.scoring_parameters')).toBe('1');
  });

  it('is idempotent — running again does not duplicate rows', async () => {
    await runSeed();
    await runSeed();

    expect(await count('irl_catalog.dimension')).toBe('6');
    expect(await count('irl_catalog.statement')).toBe('48');
    expect(await count('irl_catalog.published_ordinal_profile')).toBe('6');
  });

  it('preserves exactly 8 statements per dimension', async () => {
    await runSeed();

    const rows = await dataSource.query<{ code: string; cnt: string }[]>(
      `SELECT d.code, COUNT(s.id_statement)::text AS cnt
         FROM irl_catalog.dimension d
         JOIN irl_catalog.statement s ON s.id_dimension = d.id_dimension
        GROUP BY d.code
        ORDER BY d.code`,
    );

    expect(rows).toHaveLength(6);
    for (const r of rows) {
      expect(r.cnt).toBe('8');
    }
  });

  it('marks CRL, BRL and TmRL as susceptible to a critical state (RF-13)', async () => {
    await runSeed();

    const rows = await dataSource.query<{ code: string }[]>(
      `SELECT code FROM irl_catalog.dimension WHERE is_critical_dimension ORDER BY code`,
    );

    expect(rows.map((r) => r.code)).toEqual(['BRL', 'CRL', 'TmRL']);
  });
});
