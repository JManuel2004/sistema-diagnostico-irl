import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { InitialSchema1747526400001 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518001-InitialSchema.js';
import { seedCatalog } from '../../../src/shared/kernel/infrastructure/database/seeds/seed-catalog.js';
import { DiagnosisOrm } from '../../../src/modules/diagnosis/infrastructure/database/orm-entities/diagnosis.orm-entity.js';
import { TypeOrmDiagnosisRepository } from '../../../src/modules/diagnosis/infrastructure/database/repositories/typeorm-diagnosis.repository.js';

/**
 * Discarding the diagnostics a user left unfinished (DIAGIRL-26).
 *
 * Starting a new diagnostic deletes the user's incomplete ones, with what
 * hangs from them; a completed diagnostic, and anyone else's, is never
 * touched.
 */
describe('Diagnosis repository — unfinished diagnostics (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let repo: TypeOrmDiagnosisRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    dataSource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      entities: [DiagnosisOrm],
      migrations: [InitialSchema1747526400001],
      migrationsTableName: 'typeorm_migrations',
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.transaction((manager) => seedCatalog(manager));
    repo = new TypeOrmDiagnosisRepository(
      dataSource.getRepository(DiagnosisOrm),
    );
  }, 180_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    await container?.stop();
  });

  async function insert(userId: string, state: string): Promise<string> {
    const id = randomUUID();
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic (id, cognito_user_id, state, id_framework_version)
       VALUES ($1, $2, $3, (SELECT id FROM irl_catalog.framework_version WHERE code = 'KTH-IRL-1.0'))`,
      [id, userId, state],
    );
    return id;
  }

  async function exists(id: string): Promise<boolean> {
    const rows = await dataSource.query<unknown[]>(
      `SELECT 1 FROM irl_diagnostic.diagnostic WHERE id = $1`,
      [id],
    );
    return rows.length > 0;
  }

  it('deletes only the unfinished diagnostics of that user', async () => {
    const user = `user-${randomUUID()}`;
    const started = await insert(user, 'STARTED');
    const withInitiative = await insert(user, 'WITH_INITIATIVE');
    const profiled = await insert(user, 'PROFILE_GENERATED');
    const deep = await insert(user, 'DEEP_ANALYSIS_COMPLETE');
    const othersUnfinished = await insert(
      `other-${randomUUID()}`,
      'WITH_INITIATIVE',
    );

    await expect(repo.deleteIncompleteByUserId(user)).resolves.toBe(2);

    expect(await exists(started)).toBe(false);
    expect(await exists(withInitiative)).toBe(false);
    expect(await exists(profiled)).toBe(true);
    expect(await exists(deep)).toBe(true);
    expect(await exists(othersUnfinished)).toBe(true);
  });

  it('takes what hangs from the diagnostic with it', async () => {
    const user = `user-${randomUUID()}`;
    const id = await insert(user, 'WITH_INITIATIVE');
    await dataSource.query(
      `INSERT INTO irl_diagnostic.answer (id_diagnostic, id_statement, likert_value)
       SELECT $1, id_statement, 3 FROM irl_catalog.statement ORDER BY id_statement LIMIT 1`,
      [id],
    );

    await repo.deleteIncompleteByUserId(user);

    const answers = await dataSource.query<unknown[]>(
      `SELECT 1 FROM irl_diagnostic.answer WHERE id_diagnostic = $1`,
      [id],
    );
    expect(answers).toEqual([]);
  });

  it('does nothing when the user has no unfinished diagnostic', async () => {
    const user = `user-${randomUUID()}`;
    const profiled = await insert(user, 'PROFILE_GENERATED');

    await expect(repo.deleteIncompleteByUserId(user)).resolves.toBe(0);
    expect(await exists(profiled)).toBe(true);
  });
});
