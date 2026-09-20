import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { InitialSchema1747526400001 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518001-InitialSchema.js';
import { seedCatalog } from '../../../src/shared/kernel/infrastructure/database/seeds/seed-catalog.js';
import { InitiativeOrm } from '../../../src/modules/initiative/infrastructure/database/orm-entities/initiative.orm-entity.js';
import { SectorOrm } from '../../../src/modules/initiative/infrastructure/database/orm-entities/sector.orm-entity.js';
import { InitiativeStageOrm } from '../../../src/modules/initiative/infrastructure/database/orm-entities/initiative-stage.orm-entity.js';
import { TypeOrmInitiativeRepository } from '../../../src/modules/initiative/infrastructure/database/repositories/typeorm-initiative.repository.js';
import { TypeOrmInitiativeCatalogRepository } from '../../../src/modules/initiative/infrastructure/database/repositories/typeorm-initiative-catalog.repository.js';
import { Initiative } from '../../../src/modules/initiative/domain/entities/initiative.aggregate.js';
import { Uuid } from '../../../src/shared/kernel/domain/value-objects/uuid.vo.js';

/**
 * Persistence of the initiative profile and the catalogs its form reads.
 */
describe('Initiative profile — persistence (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let repo: TypeOrmInitiativeRepository;
  let catalog: TypeOrmInitiativeCatalogRepository;
  let diagnosticId: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    dataSource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      entities: [InitiativeOrm, SectorOrm, InitiativeStageOrm],
      migrations: [InitialSchema1747526400001],
      migrationsTableName: 'typeorm_migrations',
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.transaction((manager) => seedCatalog(manager));

    repo = new TypeOrmInitiativeRepository(dataSource.getRepository(InitiativeOrm));
    catalog = new TypeOrmInitiativeCatalogRepository(
      dataSource.getRepository(SectorOrm),
      dataSource.getRepository(InitiativeStageOrm),
    );
  }, 180_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    await container?.stop();
  });

  beforeEach(async () => {
    diagnosticId = randomUUID();
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic (id, cognito_user_id, state, irl_framework_version)
       VALUES ($1, 'u', 'WITH_CONSENT', 'KTH-IRL-1.0')`,
      [diagnosticId],
    );
  });

  async function initiative(over: Record<string, unknown> = {}): Promise<Initiative> {
    const [sector] = await catalog.findAllSectors();
    const stage = await catalog.findStageByCode('validacion');
    return Initiative.register({
      id: Uuid.generate(),
      diagnosticId: Uuid.create(diagnosticId),
      sectorId: sector.id,
      name: 'AgroConecta',
      productType: 'Aplicación web',
      stageId: stage!.id,
      declaredStage: 'Piloto completado',
      teamSize: 3,
      teamDescription: 'Fundadora, coordinadora y desarrollador externo',
      targetMarket: 'Productores de café',
      currentFunding: 'Ahorros de la fundadora',
      ...over,
    });
  }

  it('the seed carries the sector of the case and the three stages in order', async () => {
    const sectors = await catalog.findAllSectors();
    const stages = await catalog.findAllStages();

    expect(sectors.map((s) => s.name)).toContain('Agroindustria / AgriTech');
    expect(stages.map((s) => s.code)).toEqual(['idea', 'validacion', 'crecimiento']);
  });

  it('seeding twice does not duplicate the sector', async () => {
    await dataSource.transaction((manager) => seedCatalog(manager));

    const sectors = await catalog.findAllSectors();

    expect(sectors.filter((s) => s.name === 'Agroindustria / AgriTech')).toHaveLength(1);
  });

  it('reads back the whole profile that was saved', async () => {
    const saved = await initiative();

    await repo.save(saved);
    const read = await repo.findByDiagnosticId(diagnosticId);

    expect(read!.toPersistence()).toEqual(saved.toPersistence());
    expect(read!.teamSize).toBe(3);
    expect(read!.targetMarket).toBe('Productores de café');
  });

  it('saving again updates the same initiative instead of adding another', async () => {
    const first = await initiative();
    await repo.save(first);
    await repo.save(await initiative({ currentFunding: 'Un incentivo regional' }));

    const rows = await dataSource.query<{ count: string }[]>(
      `SELECT count(*) FROM irl_diagnostic.initiative WHERE id_diagnostic = $1`,
      [diagnosticId],
    );
    const read = await repo.findByDiagnosticId(diagnosticId);

    expect(Number(rows[0].count)).toBe(1);
    expect(read!.currentFunding).toBe('Un incentivo regional');
    expect(read!.id.value).toBe(first.id.value);
  });

  it('has no short_description column anymore: it was replaced by product_type', async () => {
    const columns = await dataSource.query<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'irl_diagnostic' AND table_name = 'initiative'`,
    );
    const names = columns.map((c) => c.column_name);

    expect(names).not.toContain('short_description');
    expect(names).toEqual(
      expect.arrayContaining([
        'product_type',
        'declared_stage',
        'team_description',
        'target_market',
        'current_funding',
      ]),
    );
  });
});
