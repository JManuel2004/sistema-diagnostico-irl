import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { InitialSchema1747526400001 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518001-InitialSchema.js';
import { DIMENSIONS } from '../../../src/shared/kernel/infrastructure/database/seeds/data/dimensions.js';
import { DIMENSION_DEPENDENCIES } from '../../../src/shared/kernel/infrastructure/database/seeds/data/dimension-dependencies.js';
import { seedRoadmapGraph } from '../../../src/shared/kernel/infrastructure/database/seeds/seed-roadmap-graph.js';

/**
 * Integración del seed del graph de dependencies contra Postgres real.
 *
 * Verifica lo que un test unitario no puede: que las FKs se resuelvan
 * por `code` (no por id, que es IDENTITY y no estable), que el
 * `ON CONFLICT` sea idempotente de verdad, y que la lista de columnas
 * del `DO UPDATE` incluya efectivamente las mutables — omitir una haría
 * que el seed pareciera idempotente pero nunca actualizara ese valor.
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

    // Las seis dimensions, con su nivel mínimo esperado.
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
    const rows = await dataSource.query<{ codigo: string; nivel: number }[]>(
      `SELECT code AS codigo, minimum_expected_level AS nivel
         FROM irl_catalog.dimension ORDER BY sequence`,
    );
    expect(rows).toHaveLength(6);
    expect(rows.every((f) => f.nivel === 4)).toBe(true);
  });

  it('una segunda ejecución no duplica rows', async () => {
    await dataSource.transaction((m) => seedRoadmapGraph(m));

    const [{ count }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.dimension_dependency`,
    );
    expect(count).toBe('9');
  });

  it('el DO UPDATE actualiza de verdad el nivel requerido', async () => {
    // Si `minimum_required_level` faltara de la lista de columnas
    // actualizables, el seed parecería idempotente pero nunca corregiría
    // el valor tras el primer INSERT.
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
    // UNIQUE(source, target) no ve que FRL->BRL cierre un lazo con
    // BRL->FRL. Por eso la aciclicidad se comprueba tres veces en código.
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
