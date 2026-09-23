import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { InitialSchema1747526400001 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518001-InitialSchema.js';
import { DIMENSIONS } from '../../../src/shared/kernel/infrastructure/database/seeds/data/dimensions.js';
import { DIMENSION_DEPENDENCIES } from '../../../src/shared/kernel/infrastructure/database/seeds/data/dimension-dependencies.js';
import { seedRoadmapGraph } from '../../../src/shared/kernel/infrastructure/database/seeds/seed-roadmap-graph.js';

/**
 * Integration of the dependency graph seed against a real Postgres.
 *
 * Checks what a unit test cannot: that the FKs resolve by `code` (not by
 * id, which is IDENTITY and not stable), that the `ON CONFLICT` is really
 * idempotent, and that the column list of the `DO UPDATE` does include the
 * mutable ones — leaving one out would make the seed look idempotent while
 * never updating that value.
 */
describe('Seed del graph de dependencies (integration)', () => {
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

    // The six dimensions, with their expected minimum level.
    for (const d of DIMENSIONS) {
      await dataSource.query(
        `INSERT INTO irl_catalog.dimension
           (code, name_es, name_en, short_name_es, description,
            is_critical_dimension, sequence, minimum_expected_level)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
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
  }, 120_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    await container?.stop();
  });

  it('siembra las nueve edges resolviendo las FKs por código', async () => {
    await dataSource.transaction((m) => seedRoadmapGraph(m));

    const rows = await dataSource.query<
      { source: string; target: string; req: number }[]
    >(
      `SELECT o.code AS source, d.code AS target,
              dep.minimum_required_level AS req
         FROM irl_catalog.dimension_dependency dep
         JOIN irl_catalog.dimension o ON o.id_dimension = dep.id_dimension_source
         JOIN irl_catalog.dimension d ON d.id_dimension = dep.id_dimension_target
        ORDER BY source, target`,
    );

    expect(rows).toHaveLength(9);
    expect(rows.map((f) => `${f.source}->${f.target}:${f.req}`).sort()).toEqual(
      [...DIMENSION_DEPENDENCIES]
        .map((a) => `${a.source}->${a.target}:${a.minimumRequiredLevel}`)
        .sort(),
    );
  });

  it('las seis dimensions quedan con nivel mínimo esperado 4', async () => {
    const rows = await dataSource.query<{ code: string; level: number }[]>(
      `SELECT code, minimum_expected_level AS level
         FROM irl_catalog.dimension ORDER BY sequence`,
    );
    expect(rows).toHaveLength(6);
    expect(rows.every((f) => f.level === 4)).toBe(true);
  });

  it('una segunda ejecución no duplica rows', async () => {
    await dataSource.transaction((m) => seedRoadmapGraph(m));

    const [{ count }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.dimension_dependency`,
    );
    expect(count).toBe('9');
  });

  it('el DO UPDATE actualiza de verdad el nivel requerido', async () => {
    // If `minimum_required_level` were missing from the list of updatable
    // columns, the seed would look idempotent but would never correct the
    // value after the first INSERT.
    await dataSource.query(
      `UPDATE irl_catalog.dimension_dependency SET minimum_required_level = 9`,
    );
    await dataSource.transaction((m) => seedRoadmapGraph(m));

    const [{ count }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count
         FROM irl_catalog.dimension_dependency WHERE minimum_required_level = 9`,
    );
    expect(count).toBe('0');
  });

  it('la base rechaza una edge reflexiva', async () => {
    await expect(
      dataSource.query(
        `INSERT INTO irl_catalog.dimension_dependency
           (id_dimension_source, id_dimension_target, minimum_required_level)
         SELECT d.id_dimension, d.id_dimension, 3
           FROM irl_catalog.dimension d WHERE d.code = 'TRL'`,
      ),
    ).rejects.toThrow(/ck_dimension_dependency_not_reflexive/);
  });

  it('la base rechaza duplicar el mismo par dirigido', async () => {
    await expect(
      dataSource.query(
        `INSERT INTO irl_catalog.dimension_dependency
           (id_dimension_source, id_dimension_target, minimum_required_level)
         SELECT o.id_dimension, d.id_dimension, 3
           FROM irl_catalog.dimension o, irl_catalog.dimension d
          WHERE o.code = 'BRL' AND d.code = 'FRL'`,
      ),
    ).rejects.toThrow(/uq_dimension_dependency_pair/);
  });

  it('la base admite la edge inversa: la aciclicidad no la impone el esquema', async () => {
    // UNIQUE(source, target) does not see that FRL->BRL closes a loop with
    // BRL->FRL. That is why acyclicity is checked three times in code.
    await dataSource.query(
      `INSERT INTO irl_catalog.dimension_dependency
         (id_dimension_source, id_dimension_target, minimum_required_level)
       SELECT o.id_dimension, d.id_dimension, 3
         FROM irl_catalog.dimension o, irl_catalog.dimension d
        WHERE o.code = 'FRL' AND d.code = 'BRL'`,
    );

    const [{ count }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.dimension_dependency`,
    );
    expect(count).toBe('10');

    await dataSource.query(
      `DELETE FROM irl_catalog.dimension_dependency dep
        USING irl_catalog.dimension o, irl_catalog.dimension d
        WHERE dep.id_dimension_source = o.id_dimension
          AND dep.id_dimension_target = d.id_dimension
          AND o.code = 'FRL' AND d.code = 'BRL'`,
    );
  });
});
