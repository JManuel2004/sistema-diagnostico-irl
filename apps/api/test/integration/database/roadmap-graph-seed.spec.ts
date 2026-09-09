import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { InitialSchema1747526400001 } from '../../../src/infrastructure/database/migrations/20260518001-InitialSchema.js';
import { CatalogConversionAndPairs1747526400002 } from '../../../src/infrastructure/database/migrations/20260518002-CatalogConversionAndPairs.js';
import { RemainingCatalogTables1747526400003 } from '../../../src/infrastructure/database/migrations/20260518003-RemainingCatalogTables.js';
import { RemainingDiagnosticTables1747526400004 } from '../../../src/infrastructure/database/migrations/20260518004-RemainingDiagnosticTables.js';
import { RemoveSingleRuleRoutingModel1747526400005 } from '../../../src/infrastructure/database/migrations/20260518005-RemoveSingleRuleRoutingModel.js';
import { ExtendDiagnosticStateCheck1747526400006 } from '../../../src/infrastructure/database/migrations/20260518006-ExtendDiagnosticStateCheck.js';
import { RoutingCalibration1747526400007 } from '../../../src/infrastructure/database/migrations/20260518007-RoutingCalibration.js';
import { RoutingConfigurationVersion1747526400008 } from '../../../src/infrastructure/database/migrations/20260518008-RoutingConfigurationVersion.js';
import { RoutingConfigurationDraft1747526400009 } from '../../../src/infrastructure/database/migrations/20260518009-RoutingConfigurationDraft.js';
import { RecommendationResultAndTrace1747526400010 } from '../../../src/infrastructure/database/migrations/20260518010-RecommendationResultAndTrace.js';
import { InitiativeCharacterization1747526400011 } from '../../../src/infrastructure/database/migrations/20260518011-InitiativeCharacterization.js';
import { RoadmapDependencyGraph1747526400012 } from '../../../src/infrastructure/database/migrations/20260518012-RoadmapDependencyGraph.js';
import { DIMENSIONS } from '../../../src/infrastructure/database/seeds/data/dimensions.js';
import { DIMENSION_DEPENDENCIES } from '../../../src/infrastructure/database/seeds/data/dimension-dependencies.js';
import { seedRoadmapGraph } from '../../../src/infrastructure/database/seeds/seed-roadmap-graph.js';

/**
 * Integración del seed del grafo de dependencias contra Postgres real.
 *
 * Verifica lo que un test unitario no puede: que las FKs se resuelvan
 * por `codigo` (no por id, que es IDENTITY y no estable), que el
 * `ON CONFLICT` sea idempotente de verdad, y que la lista de columnas
 * del `DO UPDATE` incluya efectivamente las mutables — omitir una haría
 * que el seed pareciera idempotente pero nunca actualizara ese valor.
 */
describe('Seed del grafo de dependencias (integration)', () => {
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
      migrations: [
        InitialSchema1747526400001,
        CatalogConversionAndPairs1747526400002,
        RemainingCatalogTables1747526400003,
        RemainingDiagnosticTables1747526400004,
        RemoveSingleRuleRoutingModel1747526400005,
        ExtendDiagnosticStateCheck1747526400006,
        RoutingCalibration1747526400007,
        RoutingConfigurationVersion1747526400008,
        RoutingConfigurationDraft1747526400009,
        RecommendationResultAndTrace1747526400010,
        InitiativeCharacterization1747526400011,
        RoadmapDependencyGraph1747526400012,
      ],
      migrationsTableName: 'typeorm_migrations',
    });

    await dataSource.initialize();
    await dataSource.runMigrations();

    // Las seis dimensiones, con su nivel mínimo esperado.
    for (const d of DIMENSIONS) {
      await dataSource.query(
        `INSERT INTO irl_catalog.dimension
           (codigo, nombre_es, nombre_en, descripcion, es_dimension_critica,
            orden, nivel_minimo_esperado)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          d.codigo,
          d.nombreEs,
          d.nombreEn,
          d.descripcion,
          d.esDimensionCritica,
          d.orden,
          d.nivelMinimoEsperado,
        ],
      );
    }
  }, 120_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    await container?.stop();
  });

  it('siembra las nueve aristas resolviendo las FKs por código', async () => {
    await dataSource.transaction((m) => seedRoadmapGraph(m));

    const filas = await dataSource.query<
      { origen: string; destino: string; req: number }[]
    >(
      `SELECT o.codigo AS origen, d.codigo AS destino,
              dep.nivel_minimo_requerido AS req
         FROM irl_catalog.dependencia_dimension dep
         JOIN irl_catalog.dimension o ON o.id_dimension = dep.id_dimension_origen
         JOIN irl_catalog.dimension d ON d.id_dimension = dep.id_dimension_destino
        ORDER BY origen, destino`,
    );

    expect(filas).toHaveLength(9);
    expect(filas.map((f) => `${f.origen}->${f.destino}:${f.req}`).sort()).toEqual(
      [...DIMENSION_DEPENDENCIES]
        .map((a) => `${a.origen}->${a.destino}:${a.nivelMinimoRequerido}`)
        .sort(),
    );
  });

  it('las seis dimensiones quedan con nivel mínimo esperado 4', async () => {
    const filas = await dataSource.query<
      { codigo: string; nivel: number }[]
    >(
      `SELECT codigo, nivel_minimo_esperado AS nivel
         FROM irl_catalog.dimension ORDER BY orden`,
    );
    expect(filas).toHaveLength(6);
    expect(filas.every((f) => f.nivel === 4)).toBe(true);
  });

  it('una segunda ejecución no duplica filas', async () => {
    await dataSource.transaction((m) => seedRoadmapGraph(m));

    const [{ count }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.dependencia_dimension`,
    );
    expect(count).toBe('9');
  });

  it('el DO UPDATE actualiza de verdad el nivel requerido', async () => {
    // Si `nivel_minimo_requerido` faltara de la lista de columnas
    // actualizables, el seed parecería idempotente pero nunca corregiría
    // el valor tras el primer INSERT.
    await dataSource.query(
      `UPDATE irl_catalog.dependencia_dimension SET nivel_minimo_requerido = 9`,
    );
    await dataSource.transaction((m) => seedRoadmapGraph(m));

    const [{ count }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count
         FROM irl_catalog.dependencia_dimension WHERE nivel_minimo_requerido = 9`,
    );
    expect(count).toBe('0');
  });

  it('la base rechaza una arista reflexiva', async () => {
    await expect(
      dataSource.query(
        `INSERT INTO irl_catalog.dependencia_dimension
           (id_dimension_origen, id_dimension_destino, nivel_minimo_requerido)
         SELECT d.id_dimension, d.id_dimension, 3
           FROM irl_catalog.dimension d WHERE d.codigo = 'TRL'`,
      ),
    ).rejects.toThrow(/ck_dependencia_no_reflexiva/);
  });

  it('la base rechaza duplicar el mismo par dirigido', async () => {
    await expect(
      dataSource.query(
        `INSERT INTO irl_catalog.dependencia_dimension
           (id_dimension_origen, id_dimension_destino, nivel_minimo_requerido)
         SELECT o.id_dimension, d.id_dimension, 3
           FROM irl_catalog.dimension o, irl_catalog.dimension d
          WHERE o.codigo = 'BRL' AND d.codigo = 'FRL'`,
      ),
    ).rejects.toThrow(/uq_dependencia_par/);
  });

  it('la base admite la arista inversa: la aciclicidad no la impone el esquema', async () => {
    // UNIQUE(origen, destino) no ve que FRL->BRL cierre un lazo con
    // BRL->FRL. Por eso la aciclicidad se comprueba tres veces en código.
    await dataSource.query(
      `INSERT INTO irl_catalog.dependencia_dimension
         (id_dimension_origen, id_dimension_destino, nivel_minimo_requerido)
       SELECT o.id_dimension, d.id_dimension, 3
         FROM irl_catalog.dimension o, irl_catalog.dimension d
        WHERE o.codigo = 'FRL' AND d.codigo = 'BRL'`,
    );

    const [{ count }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count FROM irl_catalog.dependencia_dimension`,
    );
    expect(count).toBe('10');

    await dataSource.query(
      `DELETE FROM irl_catalog.dependencia_dimension dep
        USING irl_catalog.dimension o, irl_catalog.dimension d
        WHERE dep.id_dimension_origen = o.id_dimension
          AND dep.id_dimension_destino = d.id_dimension
          AND o.codigo = 'FRL' AND d.codigo = 'BRL'`,
    );
  });
});
