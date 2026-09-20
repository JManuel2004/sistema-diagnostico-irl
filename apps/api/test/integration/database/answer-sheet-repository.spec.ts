import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { InitialSchema1747526400001 } from '../../../src/shared/kernel/infrastructure/database/migrations/20260518001-InitialSchema.js';
import { seedCatalog } from '../../../src/shared/kernel/infrastructure/database/seeds/seed-catalog.js';
import { AnswerOrm } from '../../../src/modules/diagnosis/infrastructure/database/orm-entities/answer.orm-entity.js';
import { TypeOrmAnswerSheetRepository } from '../../../src/modules/diagnosis/infrastructure/database/repositories/typeorm-answer-sheet.repository.js';
import { AnswerSheet } from '../../../src/modules/diagnosis/domain/entities/answer-sheet.aggregate.js';
import { LikertValue } from '../../../src/shared/kernel/domain/value-objects/likert-value.vo.js';
import { Uuid } from '../../../src/shared/kernel/domain/value-objects/uuid.vo.js';

/**
 * Persistence of the answers with their justification.
 *
 * The justification is mandatory in three places — the domain, the contract
 * and the database. This spec covers the last one: the column is `NOT NULL`
 * and a blank value violates `ck_answer_justification`, so an insert that
 * skips the domain still cannot store an answer without its reason.
 */
describe('Answers with justification — persistence (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let repo: TypeOrmAnswerSheetRepository;
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
      entities: [AnswerOrm],
      migrations: [InitialSchema1747526400001],
      migrationsTableName: 'typeorm_migrations',
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.transaction((manager) => seedCatalog(manager));

    repo = new TypeOrmAnswerSheetRepository(dataSource.getRepository(AnswerOrm));
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
      `INSERT INTO irl_diagnostic.diagnostic (id, cognito_user_id, state, irl_framework_version)
       VALUES ($1, 'u', 'QUESTIONNAIRE_IN_PROGRESS', 'KTH-IRL-1.0')`,
      [diagnosticId],
    );
  });

  function sheet(justifications: string[]): AnswerSheet {
    const s = AnswerSheet.create(Uuid.create(diagnosticId));
    justifications.forEach((j, i) => s.setAnswer(statementIds[i], LikertValue.create(3), j));
    return s;
  }

  it('reads back each answer with the justification it was saved with', async () => {
    await repo.save(sheet(['Primera razón', 'Segunda razón', 'Tercera razón']));

    const read = await repo.findByDiagnosticId(diagnosticId);

    expect(read).not.toBeNull();
    expect(read!.answers().map((a) => a.justification)).toEqual([
      'Primera razón',
      'Segunda razón',
      'Tercera razón',
    ]);
  });

  it('replaces the previous answers, justifications included', async () => {
    await repo.save(sheet(['Vieja']));
    await repo.save(sheet(['Nueva']));

    const read = await repo.findByDiagnosticId(diagnosticId);

    expect(read!.answers()).toHaveLength(1);
    expect(read!.answers()[0].justification).toBe('Nueva');
  });

  it('keeps a justification of exactly 1000 characters', async () => {
    await repo.save(sheet(['x'.repeat(1000)]));

    const read = await repo.findByDiagnosticId(diagnosticId);

    expect(read!.answers()[0].justification).toHaveLength(1000);
  });

  it('the database refuses an answer without a justification (NULL)', async () => {
    await expect(
      dataSource.query(
        `INSERT INTO irl_diagnostic.answer (id_diagnostic, id_statement, likert_value)
         VALUES ($1, $2, 3)`,
        [diagnosticId, statementIds[0]],
      ),
    ).rejects.toThrow(/justification/);
  });

  it.each(['', '   ', '\n\t'])(
    'the database refuses a blank justification (%j) even if the domain is skipped',
    async (blank) => {
      await expect(
        dataSource.query(
          `INSERT INTO irl_diagnostic.answer (id_diagnostic, id_statement, likert_value, justification)
           VALUES ($1, $2, 3, $3)`,
          [diagnosticId, statementIds[0], blank],
        ),
      ).rejects.toThrow(/ck_answer_justification/);
    },
  );

  it('the database refuses a justification above 1000 characters', async () => {
    await expect(
      dataSource.query(
        `INSERT INTO irl_diagnostic.answer (id_diagnostic, id_statement, likert_value, justification)
         VALUES ($1, $2, 3, $3)`,
        [diagnosticId, statementIds[0], 'x'.repeat(1001)],
      ),
    ).rejects.toThrow();
  });
});
