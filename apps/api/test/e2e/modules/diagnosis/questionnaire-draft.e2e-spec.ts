import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import request from 'supertest';
import nock from 'nock';
import { randomUUID } from 'node:crypto';
import { diagnosticSchema, questionnaireDraftSchema } from '@innlab/contracts';
import { AppModule } from '../../../../src/app.module.js';
import { configureApp } from '../../../../src/shared/kernel/infrastructure/http/configure-app.js';
import { authenticateAgainst } from '../../support/authenticated-app.js';
import { agroconectaAnswers } from '../../support/agroconecta-case.js';

/**
 * E2E — the questionnaire draft saved on the server.
 *
 * What the user answers is saved while they answer, so closing the session
 * loses nothing: a later session (another token of the same user) reads it
 * back. Only the owner reads or writes it. It is deleted once the answers
 * are processed. Needs the migrated and seeded database.
 */
describe('Borrador del cuestionario en el servidor (e2e)', () => {
  const owner = randomUUID();
  const intruder = randomUUID();
  let app: NestFastifyApplication;
  let dataSource: DataSource;
  let diagnosticId: string;
  let statements: { id_statement: string; code: string; sequence: number }[];

  function as(user: string) {
    return request
      .agent(app.getHttpServer())
      .set('Authorization', authenticateAgainst(app, user));
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ logger: false }),
    );
    configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    dataSource = app.get(DataSource);

    const res = await as(owner).post('/api/v1/diagnostics').expect(201);
    diagnosticId = diagnosticSchema.parse(res.body).id;
    // Consent and initiative are covered by their own suites.
    await dataSource.query(
      `UPDATE irl_diagnostic.diagnostic SET state = 'WITH_INITIATIVE' WHERE id = $1`,
      [diagnosticId],
    );
    statements = await dataSource.query(
      `SELECT s.id_statement::text AS id_statement, d.code, s.sequence
         FROM irl_catalog.statement s
         JOIN irl_catalog.dimension d ON d.id_dimension = s.id_dimension
        ORDER BY d.sequence, s.sequence`,
    );
  }, 60_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        `DELETE FROM irl_diagnostic.diagnostic WHERE cognito_user_id = ANY($1)`,
        [[owner, intruder]],
      );
    }
    nock.cleanAll();
    await app?.close();
  });

  it('saves what was answered so far and marks the questionnaire as started', async () => {
    const res = await as(owner)
      .put(`/api/v1/diagnostics/${diagnosticId}/questionnaire/draft`)
      .send({
        entries: [
          {
            statementId: statements[0].id_statement,
            value: 4,
            justification: 'Prototipo listo',
          },
          {
            statementId: statements[1].id_statement,
            value: null,
            justification: 'Lo pienso',
          },
        ],
      })
      .expect(200);

    const draft = questionnaireDraftSchema.parse(res.body);
    expect(draft.entries).toHaveLength(2);
    expect(draft.updatedAt).not.toBeNull();

    const diagnostic = await as(owner)
      .get(`/api/v1/diagnostics/${diagnosticId}`)
      .expect(200);
    expect(diagnosticSchema.parse(diagnostic.body).state).toBe(
      'QUESTIONNAIRE_IN_PROGRESS',
    );
  });

  it('a later session of the same user reads it back, and the panel offers to continue', async () => {
    const later = as(owner);

    const res = await later
      .get(`/api/v1/diagnostics/${diagnosticId}/questionnaire/draft`)
      .expect(200);
    expect(questionnaireDraftSchema.parse(res.body).entries).toEqual([
      {
        statementId: statements[0].id_statement,
        value: 4,
        justification: 'Prototipo listo',
      },
      {
        statementId: statements[1].id_statement,
        value: null,
        justification: 'Lo pienso',
      },
    ]);

    const inProgress = await later
      .get('/api/v1/diagnostics/in-progress')
      .expect(200);
    expect(diagnosticSchema.parse(inProgress.body).id).toBe(diagnosticId);
  });

  it('nobody else can read or overwrite it (404, as if it did not exist)', async () => {
    await as(intruder)
      .get(`/api/v1/diagnostics/${diagnosticId}/questionnaire/draft`)
      .expect(404);
    await as(intruder)
      .put(`/api/v1/diagnostics/${diagnosticId}/questionnaire/draft`)
      .send({ entries: [] })
      .expect(404);

    const res = await as(owner)
      .get(`/api/v1/diagnostics/${diagnosticId}/questionnaire/draft`)
      .expect(200);
    expect(questionnaireDraftSchema.parse(res.body).entries).toHaveLength(2);
  });

  it('rejects a malformed draft (422) and keeps the saved one', async () => {
    await as(owner)
      .put(`/api/v1/diagnostics/${diagnosticId}/questionnaire/draft`)
      .send({
        entries: [{ statementId: statements[0].id_statement, value: 9 }],
      })
      .expect(422);
    await as(owner)
      .put(`/api/v1/diagnostics/${diagnosticId}/questionnaire/draft`)
      .send({
        entries: [{ statementId: '999999', value: 3, justification: null }],
      })
      .expect(422);

    const res = await as(owner)
      .get(`/api/v1/diagnostics/${diagnosticId}/questionnaire/draft`)
      .expect(200);
    expect(questionnaireDraftSchema.parse(res.body).entries).toHaveLength(2);
  });

  it('once the answers are processed the draft is gone and cannot change (409)', async () => {
    await as(owner)
      .post(`/api/v1/diagnostics/${diagnosticId}/finalize-initial`)
      .send({ answers: agroconectaAnswers(statements) })
      .expect(201);

    const res = await as(owner)
      .get(`/api/v1/diagnostics/${diagnosticId}/questionnaire/draft`)
      .expect(200);
    expect(questionnaireDraftSchema.parse(res.body).entries).toEqual([]);

    await as(owner)
      .put(`/api/v1/diagnostics/${diagnosticId}/questionnaire/draft`)
      .send({ entries: [] })
      .expect(409);
    await as(owner).get('/api/v1/diagnostics/in-progress').expect(404);
  });
});
