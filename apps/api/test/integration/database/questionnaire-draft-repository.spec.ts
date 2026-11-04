import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { InitialSchema1747526400001 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518001-InitialSchema.js';
import { seedCatalog } from '../../../src/shared/kernel/infrastructure/database/seeds/seed-catalog.js';
import { DraftAnswerOrm } from '../../../src/modules/diagnosis/infrastructure/database/orm-entities/draft-answer.orm-entity.js';
import { TypeOrmQuestionnaireDraftRepository } from '../../../src/modules/diagnosis/infrastructure/database/repositories/typeorm-questionnaire-draft.repository.js';
import { QuestionnaireDraft } from '../../../src/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.js';

/**
 * Persistence of the questionnaire draft saved on the server.
 *
 * The draft is replaced as a whole, survives anything but the diagnostic's
 * deletion, and the database keeps the domain's guarantees: no entry
 * without a level and without a justification, and no level out of 1..5.
 */
describe('Questionnaire draft — persistence (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let repo: TypeOrmQuestionnaireDraftRepository;
  let statementIds: string[];
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
      entities: [DraftAnswerOrm],
      migrations: [InitialSchema1747526400001],
      migrationsTableName: 'typeorm_migrations',
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.transaction((manager) => seedCatalog(manager));

    repo = new TypeOrmQuestionnaireDraftRepository(
      dataSource.getRepository(DraftAnswerOrm),
    );
    const rows = await dataSource.query<{ id_statement: string }[]>(
      `SELECT id_statement::text AS id_statement FROM irl_catalog.statement ORDER BY id_statement`,
    );
    statementIds = rows.map((r) => r.id_statement);
  }, 180_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    await container?.stop();
  });

  beforeEach(async () => {
    diagnosticId = randomUUID();
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic (id, cognito_user_id, state, id_framework_version)
       VALUES ($1, 'u', 'QUESTIONNAIRE_IN_PROGRESS', (SELECT id FROM irl_catalog.framework_version WHERE code = 'KTH-IRL-1.0'))`,
      [diagnosticId],
    );
  });

  it('reads back what was saved, with the time of the save', async () => {
    const saved = await repo.replace(
      QuestionnaireDraft.from(diagnosticId, [
        {
          statementId: statementIds[0],
          value: 4,
          justification: 'Prototipo validado',
        },
        {
          statementId: statementIds[1],
          value: null,
          justification: 'Pendiente',
        },
        { statementId: statementIds[2], value: 2, justification: null },
      ]),
    );

    const read = await repo.findByDiagnosticId(diagnosticId);

    expect(read.entries()).toEqual([
      {
        statementId: statementIds[0],
        value: 4,
        justification: 'Prototipo validado',
      },
      { statementId: statementIds[1], value: null, justification: 'Pendiente' },
      { statementId: statementIds[2], value: 2, justification: null },
    ]);
    expect(read.updatedAt?.toISOString()).toBe(saved.updatedAt?.toISOString());
  });

  it('replaces the previous draft instead of adding to it', async () => {
    await repo.replace(
      QuestionnaireDraft.from(diagnosticId, [
        { statementId: statementIds[0], value: 1, justification: null },
        { statementId: statementIds[1], value: 1, justification: null },
      ]),
    );
    await repo.replace(
      QuestionnaireDraft.from(diagnosticId, [
        { statementId: statementIds[1], value: 5, justification: null },
      ]),
    );

    const read = await repo.findByDiagnosticId(diagnosticId);

    expect(read.entries()).toEqual([
      { statementId: statementIds[1], value: 5, justification: null },
    ]);
  });

  it('a diagnostic without a saved draft reads as empty', async () => {
    const read = await repo.findByDiagnosticId(diagnosticId);

    expect(read.entries()).toEqual([]);
    expect(read.updatedAt).toBeNull();
  });

  it('goes with the diagnostic when this is deleted', async () => {
    await repo.replace(
      QuestionnaireDraft.from(diagnosticId, [
        { statementId: statementIds[0], value: 3, justification: null },
      ]),
    );

    await dataSource.query(
      `DELETE FROM irl_diagnostic.diagnostic WHERE id = $1`,
      [diagnosticId],
    );

    const [{ count }] = await dataSource.query<{ count: string }[]>(
      `SELECT count(*) FROM irl_diagnostic.draft_answer WHERE id_diagnostic = $1`,
      [diagnosticId],
    );
    expect(Number(count)).toBe(0);
  });

  it('deleting the draft leaves the diagnostic', async () => {
    await repo.replace(
      QuestionnaireDraft.from(diagnosticId, [
        { statementId: statementIds[0], value: 3, justification: null },
      ]),
    );

    await repo.deleteByDiagnosticId(diagnosticId);

    expect((await repo.findByDiagnosticId(diagnosticId)).entries()).toEqual([]);
    const [{ count }] = await dataSource.query<{ count: string }[]>(
      `SELECT count(*) FROM irl_diagnostic.diagnostic WHERE id = $1`,
      [diagnosticId],
    );
    expect(Number(count)).toBe(1);
  });

  it.each([
    ['an entry with neither level nor justification', 'NULL', 'NULL'],
    ['a level out of 1..5', '6', 'NULL'],
    ['a blank justification', 'NULL', `'   '`],
  ])('the database refuses %s', async (_label, value, justification) => {
    await expect(
      dataSource.query(
        `INSERT INTO irl_diagnostic.draft_answer (id_diagnostic, id_statement, likert_value, justification)
         VALUES ($1, $2, ${value}, ${justification})`,
        [diagnosticId, statementIds[0]],
      ),
    ).rejects.toThrow(/ck_draft_answer/);
  });
});
