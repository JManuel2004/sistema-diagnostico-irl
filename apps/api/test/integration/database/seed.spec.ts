import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { InitialSchema1700000000000 } from '../../../src/infrastructure/database/migrations/1700000000000-InitialSchema.js';
import { DIMENSIONS } from '../../../src/infrastructure/database/seeds/data/dimensions.js';
import { STATEMENTS } from '../../../src/infrastructure/database/seeds/data/statements.js';

/**
 * Smoke test for the migration + seed pipeline.
 *
 * Boots a disposable Postgres via Testcontainers, applies the initial
 * migration, runs the equivalent of `db:seed`, then asserts the catalog
 * is populated as the framework demands: 6 dimensions, 48 statements.
 *
 * Also re-runs the seed to confirm idempotency — no duplicate rows,
 * updated text content reflected on the second pass.
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
      migrations: [InitialSchema1700000000000],
      migrationsTableName: 'typeorm_migrations',
    });

    await dataSource.initialize();
    await dataSource.runMigrations();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    await container?.stop();
  });

  const runSeed = async (): Promise<void> => {
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
  };

  it('populates 6 dimensions and 48 statements after a single run', async () => {
    await runSeed();

    const [{ count: dimCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.dimension`,
    );
    const [{ count: afCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.afirmacion`,
    );

    expect(dimCount).toBe('6');
    expect(afCount).toBe('48');
  });

  it('is idempotent — running again does not duplicate rows', async () => {
    await runSeed();
    await runSeed();

    const [{ count: dimCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.dimension`,
    );
    const [{ count: afCount }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.afirmacion`,
    );

    expect(dimCount).toBe('6');
    expect(afCount).toBe('48');
  });

  it('preserves exactly 8 statements per dimension', async () => {
    await runSeed();

    const rows = await dataSource.query<{ codigo: string; cnt: string }[]>(
      `SELECT d.codigo, COUNT(a.id_afirmacion)::text AS cnt
         FROM irl_catalog.dimension d
         JOIN irl_catalog.afirmacion a ON a.id_dimension = d.id_dimension
        GROUP BY d.codigo
        ORDER BY d.codigo`,
    );

    expect(rows).toHaveLength(6);
    for (const r of rows) {
      expect(r.cnt).toBe('8');
    }
  });
});
