import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { InitialSchema1747526400001 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518001-InitialSchema.js';
import { ScalingRoadmapOrm } from '../../../src/modules/roadmap/infrastructure/database/orm-entities/scaling-roadmap.orm-entity.js';
import { TypeOrmRoadmapRepository } from '../../../src/modules/roadmap/infrastructure/database/repositories/typeorm-roadmap.repository.js';
import { ScalingRoadmap } from '../../../src/modules/roadmap/domain/entities/scaling-roadmap.aggregate.js';
import { Uuid } from '../../../src/shared/kernel/domain/value-objects/uuid.vo.js';

/**
 * Persistence of the saved roadmap.
 *
 * The roadmap is a fixed result with its date: what is read back has to be
 * exactly what was saved, including the explanation fields, and saving again
 * replaces it (one roadmap per diagnostic).
 */
describe('Roadmap — persistence (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let repo: TypeOrmRoadmapRepository;
  let diagnosticId: string;

  function roadmap(generatedAt: Date, targetLevel = 4): ScalingRoadmap {
    return ScalingRoadmap.create({
      diagnosticId: Uuid.create(diagnosticId),
      generatedAt,
      phases: [
        {
          order: 1,
          dimensions: [
            {
              dimensionCode: 'BRL',
              currentLevel: 3,
              targetLevel,
              enables: ['FRL'],
              inclusionReason: 'BELOW_EXPECTED_MINIMUM',
              expectedMinimum: 4,
              targetDrivenBy: targetLevel > 4 ? 'FRL' : null,
            },
          ],
        },
        {
          order: 2,
          dimensions: [
            {
              dimensionCode: 'FRL',
              currentLevel: 2,
              targetLevel: 4,
              enables: [],
              inclusionReason: 'REQUIRED_ENABLER',
              expectedMinimum: 2,
              targetDrivenBy: null,
            },
          ],
        },
      ],
    });
  }

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    dataSource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      entities: [ScalingRoadmapOrm],
      migrations: [InitialSchema1747526400001],
      migrationsTableName: 'typeorm_migrations',
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
    // The diagnostics below point to a framework version.
    await dataSource.query(
      `INSERT INTO irl_catalog.framework_version (code, published_at) VALUES ('KTH-IRL-1.0', now())`,
    );
    repo = new TypeOrmRoadmapRepository(dataSource.getRepository(ScalingRoadmapOrm));
  }, 120_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    await container?.stop();
  });

  beforeEach(async () => {
    diagnosticId = randomUUID();
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic
         (id, cognito_user_id, state, id_framework_version)
       VALUES ($1,'u','DEEP_ANALYSIS_IN_PROGRESS',(SELECT id FROM irl_catalog.framework_version WHERE code = 'KTH-IRL-1.0'))`,
      [diagnosticId],
    );
  });

  it('returns null when nothing was saved', async () => {
    expect(await repo.findByDiagnosticId(diagnosticId)).toBeNull();
  });

  it('reads back exactly what was saved, explanation and date included', async () => {
    const saved = roadmap(new Date('2026-03-01T10:00:00.000Z'));

    await repo.save(saved);
    const read = await repo.findByDiagnosticId(diagnosticId);

    expect(read).not.toBeNull();
    expect(read!.phases).toEqual(saved.phases);
    expect(read!.generatedAt.toISOString()).toBe('2026-03-01T10:00:00.000Z');
    expect(read!.dimensionsWithoutIntervention).toEqual(saved.dimensionsWithoutIntervention);
  });

  it('replaces the previous roadmap instead of accumulating versions', async () => {
    await repo.save(roadmap(new Date('2026-03-01T10:00:00.000Z'), 4));
    await repo.save(roadmap(new Date('2026-03-02T10:00:00.000Z'), 6));

    const rows = await dataSource.query<{ count: string }[]>(
      `SELECT count(*) FROM irl_diagnostic.scaling_roadmap WHERE id_diagnostic = $1`,
      [diagnosticId],
    );
    const read = await repo.findByDiagnosticId(diagnosticId);

    expect(Number(rows[0].count)).toBe(1);
    expect(read!.generatedAt.toISOString()).toBe('2026-03-02T10:00:00.000Z');
    expect(read!.phases[0].dimensions[0].targetLevel).toBe(6);
  });

  it('is removed with its diagnostic', async () => {
    await repo.save(roadmap(new Date('2026-03-01T10:00:00.000Z')));

    await dataSource.query(`DELETE FROM irl_diagnostic.diagnostic WHERE id = $1`, [diagnosticId]);

    expect(await repo.findByDiagnosticId(diagnosticId)).toBeNull();
  });
});
