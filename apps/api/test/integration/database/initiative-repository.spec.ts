import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { InitialSchema1747526400001 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518001-InitialSchema.js';
import { seedCatalog } from '../../../src/shared/kernel/infrastructure/database/seeds/seed-catalog.js';
import { InitiativeOrm } from '../../../src/modules/initiative/infrastructure/database/orm-entities/initiative.orm-entity.js';
import { InitiativeProfileOrm } from '../../../src/modules/initiative/infrastructure/database/orm-entities/initiative-profile.orm-entity.js';
import { ConsentOrm } from '../../../src/modules/initiative/infrastructure/database/orm-entities/consent.orm-entity.js';
import { ConsentTermsOrm } from '../../../src/modules/initiative/infrastructure/database/orm-entities/consent-terms.orm-entity.js';
import { SectorOrm } from '../../../src/modules/initiative/infrastructure/database/orm-entities/sector.orm-entity.js';
import { InitiativeStageOrm } from '../../../src/modules/initiative/infrastructure/database/orm-entities/initiative-stage.orm-entity.js';
import { TypeOrmInitiativeRepository } from '../../../src/modules/initiative/infrastructure/database/repositories/typeorm-initiative.repository.js';
import { TypeOrmInitiativeProfileRepository } from '../../../src/modules/initiative/infrastructure/database/repositories/typeorm-initiative-profile.repository.js';
import { TypeOrmConsentRepository } from '../../../src/modules/initiative/infrastructure/database/repositories/typeorm-consent.repository.js';
import { TypeOrmConsentTermsRepository } from '../../../src/modules/initiative/infrastructure/database/repositories/typeorm-consent-terms.repository.js';
import { TypeOrmInitiativeCatalogRepository } from '../../../src/modules/initiative/infrastructure/database/repositories/typeorm-initiative-catalog.repository.js';
import { Initiative } from '../../../src/modules/initiative/domain/entities/initiative.aggregate.js';
import { InitiativeProfile } from '../../../src/modules/initiative/domain/entities/initiative-profile.aggregate.js';
import { Consent } from '../../../src/modules/initiative/domain/entities/consent.entity.js';
import { Uuid } from '../../../src/shared/kernel/domain/value-objects/uuid.vo.js';

/**
 * Persistence of initiatives, their consent history and the profile
 * snapshot each diagnostic keeps, plus the catalogs the form reads.
 */
describe('Initiative — persistence (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let initiatives: TypeOrmInitiativeRepository;
  let profiles: TypeOrmInitiativeProfileRepository;
  let consents: TypeOrmConsentRepository;
  let terms: TypeOrmConsentTermsRepository;
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
      entities: [
        InitiativeOrm,
        InitiativeProfileOrm,
        ConsentOrm,
        ConsentTermsOrm,
        SectorOrm,
        InitiativeStageOrm,
      ],
      migrations: [InitialSchema1747526400001],
      migrationsTableName: 'typeorm_migrations',
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.transaction((manager) => seedCatalog(manager));

    initiatives = new TypeOrmInitiativeRepository(
      dataSource.getRepository(InitiativeOrm),
    );
    profiles = new TypeOrmInitiativeProfileRepository(
      dataSource.getRepository(InitiativeProfileOrm),
    );
    consents = new TypeOrmConsentRepository(
      dataSource.getRepository(ConsentOrm),
    );
    terms = new TypeOrmConsentTermsRepository(
      dataSource.getRepository(ConsentTermsOrm),
    );
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
      `INSERT INTO irl_diagnostic.diagnostic (id, cognito_user_id, state, id_framework_version)
       SELECT $1, 'u', 'STARTED', id FROM irl_catalog.framework_version
        ORDER BY published_at DESC LIMIT 1`,
      [diagnosticId],
    );
  });

  async function createdInitiative(owner = 'u'): Promise<Initiative> {
    const initiative = Initiative.create(owner);
    await initiatives.createWithConsent(
      initiative,
      Consent.accept({
        id: Uuid.generate(),
        initiativeId: initiative.id,
        cognitoUserId: owner,
        termsVersion: 'v1',
      }),
    );
    return initiative;
  }

  async function profileOf(
    initiative: Initiative,
    over: Record<string, unknown> = {},
  ): Promise<InitiativeProfile> {
    const [sector] = await catalog.findAllSectors();
    const stage = await catalog.findStageByCode('validacion');
    return InitiativeProfile.register({
      id: Uuid.generate(),
      initiativeId: initiative.id,
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

  it('the seed carries the sector of the case, the three stages and the consent text', async () => {
    const sectors = await catalog.findAllSectors();
    const stages = await catalog.findAllStages();
    const current = await terms.findCurrent();

    expect(sectors.map((s) => s.name)).toContain('Agroindustria / AgriTech');
    expect(stages.map((s) => s.code)).toEqual([
      'idea',
      'validacion',
      'crecimiento',
    ]);
    expect(current?.version).toBe('v1');
    expect(current?.sections.length).toBeGreaterThan(0);
  });

  it('seeding twice does not duplicate the sector', async () => {
    await dataSource.transaction((manager) => seedCatalog(manager));

    const sectors = await catalog.findAllSectors();

    expect(
      sectors.filter((s) => s.name === 'Agroindustria / AgriTech'),
    ).toHaveLength(1);
  });

  it('an initiative is stored with its first consent and listed for its owner', async () => {
    const initiative = await createdInitiative('owner-a');

    const listed = await initiatives.findByOwner('owner-a');
    const consent = await consents.findLatestByInitiativeId(
      initiative.id.value,
    );

    expect(listed.map((i) => i.id.value)).toEqual([initiative.id.value]);
    expect(consent?.termsVersion).toBe('v1');
  });

  it('the consent is a history: a new acceptance is added, the earlier one kept', async () => {
    const initiative = await createdInitiative();
    await dataSource.query(
      `INSERT INTO irl_catalog.consent_terms (version, title, sections, checkbox_label, published_at)
       VALUES ('v2', 'T', '[{"heading":"H","body":"B"}]', 'Acepto', now())`,
    );
    await consents.add(
      Consent.accept({
        id: Uuid.generate(),
        initiativeId: initiative.id,
        cognitoUserId: 'u',
        termsVersion: 'v2',
      }),
    );

    const rows = await dataSource.query<{ terms_version: string }[]>(
      `SELECT terms_version FROM irl_diagnostic.consent WHERE id_initiative = $1 ORDER BY accepted_at`,
      [initiative.id.value],
    );
    expect(rows.map((r) => r.terms_version)).toEqual(['v1', 'v2']);
    expect(
      (await consents.findLatestByInitiativeId(initiative.id.value))
        ?.termsVersion,
    ).toBe('v2');
    expect((await terms.findCurrent())?.version).toBe('v2');

    await dataSource.query(
      `DELETE FROM irl_diagnostic.consent WHERE terms_version = 'v2'`,
    );
    await dataSource.query(
      `DELETE FROM irl_catalog.consent_terms WHERE version = 'v2'`,
    );
  });

  it("the database refuses a consent whose user is not the initiative's owner", async () => {
    const initiative = await createdInitiative('owner-a');

    await expect(
      consents.add(
        Consent.accept({
          id: Uuid.generate(),
          initiativeId: initiative.id,
          cognitoUserId: 'owner-b',
          termsVersion: 'v1',
        }),
      ),
    ).rejects.toThrow(/fk_consent_initiative_owner/);
  });

  it('the database refuses a consent to a text that was never published', async () => {
    const initiative = await createdInitiative();

    await expect(
      consents.add(
        Consent.accept({
          id: Uuid.generate(),
          initiativeId: initiative.id,
          cognitoUserId: 'u',
          termsVersion: 'v9',
        }),
      ),
    ).rejects.toThrow(/fk_consent_terms/);
  });

  it("reads back the whole snapshot of the diagnostic's profile", async () => {
    const initiative = await createdInitiative();
    const saved = await profileOf(initiative);

    await profiles.save(saved);
    const read = await profiles.findByDiagnosticId(diagnosticId);

    expect(read!.toPersistence()).toEqual(saved.toPersistence());
    expect(
      (await profiles.findLatestByInitiativeId(initiative.id.value))?.id.value,
    ).toBe(saved.id.value);
  });

  it("saving again replaces the diagnostic's snapshot instead of adding another", async () => {
    const initiative = await createdInitiative();
    const first = await profileOf(initiative);
    await profiles.save(first);
    await profiles.save(
      await profileOf(initiative, { currentFunding: 'Un incentivo regional' }),
    );

    const rows = await dataSource.query<{ count: string }[]>(
      `SELECT count(*) FROM irl_diagnostic.initiative_profile WHERE id_diagnostic = $1`,
      [diagnosticId],
    );
    const read = await profiles.findByDiagnosticId(diagnosticId);

    expect(Number(rows[0].count)).toBe(1);
    expect(read!.currentFunding).toBe('Un incentivo regional');
    expect(read!.id.value).toBe(first.id.value);
  });
});
