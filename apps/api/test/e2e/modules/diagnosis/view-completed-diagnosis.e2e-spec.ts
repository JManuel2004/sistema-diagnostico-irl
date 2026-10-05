import { beforeAll, afterAll, describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import request from 'supertest';
import nock from 'nock';
import { randomUUID } from 'node:crypto';
import {
  diagnosticSchema,
  diagnosticSummarySchema,
  maturityProfileResponseSchema,
} from '@innlab/contracts';
import { AppModule } from '../../../../src/app.module.js';
import { configureApp } from '../../../../src/shared/kernel/infrastructure/http/configure-app.js';
import { authenticateAgainst } from '../../support/authenticated-app.js';
import { insertInitiativeWithProfile } from '../../support/initiative-rows.js';
import { agroconectaAnswers } from '../../support/agroconecta-case.js';

/**
 * E2E — consult a completed initial diagnostic (DIAGIRL-26).
 *
 * `GET /api/v1/diagnostics` lists only the caller's completed diagnostics,
 * each with its initiative, when its profile was computed and its global
 * level. A diagnostic of the caller and its stored profile are read as they
 * were saved; nothing is recalculated. Someone else's diagnostic, and one
 * that does not exist, answer 404 alike (RNF-04).
 *
 * The e2e suites share the database: this one uses its own users.
 */
describe('Consultar un diagnóstico inicial completado (e2e)', () => {
  const userId = randomUUID();
  const otherId = randomUUID();
  let app: NestFastifyApplication;
  let dataSource: DataSource;
  let agent: ReturnType<typeof request.agent>;
  let otherAgent: ReturnType<typeof request.agent>;
  let completedId: string;
  let unfinishedId: string;
  let othersCompletedId: string;

  async function insertDiagnostic(
    owner: string,
    state: string,
  ): Promise<string> {
    const id = randomUUID();
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic (id, cognito_user_id, state, id_framework_version)
       VALUES ($1, $2, $3, (SELECT id FROM irl_catalog.framework_version WHERE code = 'KTH-IRL-1.0'))`,
      [id, owner, state],
    );
    return id;
  }

  /** A diagnostic of `owner` taken through the real questionnaire to its profile. */
  async function completedDiagnostic(
    owner: string,
    ownerAgent: ReturnType<typeof request.agent>,
  ): Promise<string> {
    const id = await insertDiagnostic(owner, 'QUESTIONNAIRE_IN_PROGRESS');
    await insertInitiativeWithProfile(dataSource, id, owner);
    const statements = await dataSource.query<
      { id_statement: string; code: string; sequence: number }[]
    >(
      `SELECT a.id_statement, d.code, a.sequence
         FROM irl_catalog.statement a
         JOIN irl_catalog.dimension d ON d.id_dimension = a.id_dimension
        ORDER BY d.sequence, a.sequence`,
    );
    await ownerAgent
      .post(`/api/v1/diagnostics/${id}/finalize-initial`)
      .send({ answers: agroconectaAnswers(statements) })
      .expect(201);
    return id;
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
    agent = request
      .agent(app.getHttpServer())
      .set('Authorization', authenticateAgainst(app, userId));
    otherAgent = request
      .agent(app.getHttpServer())
      .set('Authorization', authenticateAgainst(app, otherId));

    completedId = await completedDiagnostic(userId, agent);
    unfinishedId = await insertDiagnostic(userId, 'WITH_INITIATIVE');
    othersCompletedId = await completedDiagnostic(otherId, otherAgent);
  }, 90_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      for (const owner of [userId, otherId]) {
        await dataSource.query(
          `DELETE FROM irl_diagnostic.diagnostic WHERE cognito_user_id = $1`,
          [owner],
        );
        await dataSource.query(
          `DELETE FROM irl_diagnostic.initiative WHERE cognito_user_id = $1`,
          [owner],
        );
      }
    }
    nock.cleanAll();
    await app?.close();
  });

  describe('GET /diagnostics', () => {
    it('lista solo los diagnósticos completados del usuario', async () => {
      const res = await agent.get('/api/v1/diagnostics').expect(200);
      const list = diagnosticSummarySchema.array().parse(res.body);

      expect(list.map((d) => d.id)).toEqual([completedId]);
      expect(list.map((d) => d.id)).not.toContain(unfinishedId);
      expect(list.map((d) => d.id)).not.toContain(othersCompletedId);
    });

    it('identifica cada uno por su iniciativa, la fecha de su perfil y su nivel global', async () => {
      const res = await agent.get('/api/v1/diagnostics').expect(200);
      const [summary] = diagnosticSummarySchema.array().parse(res.body);

      expect(summary.initiativeName).toBe('AgroConecta');
      expect(summary.globalAverage).toBe(3.5);
      expect(summary.profileComputedAt).not.toBeNull();
      expect(summary.completed).toBe(true);
      expect(summary.deepAnalysisAccepted).toBe(false);
    });
  });

  describe('un diagnóstico propio', () => {
    it('se lee con su estado y su perfil guardado, sin recalcular nada', async () => {
      const [{ computed_at: before }] = await dataSource.query<
        { computed_at: Date }[]
      >(
        `SELECT min(computed_at) AS computed_at FROM irl_diagnostic.dimension_result WHERE id_diagnostic = $1`,
        [completedId],
      );

      const diagnostic = diagnosticSchema.parse(
        (await agent.get(`/api/v1/diagnostics/${completedId}`).expect(200))
          .body,
      );
      const profile = maturityProfileResponseSchema.parse(
        (
          await agent
            .get(`/api/v1/diagnostics/${completedId}/profile`)
            .expect(200)
        ).body,
      );
      // Reading it again changes nothing.
      await agent.get(`/api/v1/diagnostics/${completedId}/profile`).expect(200);

      expect(diagnostic.completed).toBe(true);
      expect(diagnostic.state).toBe('PROFILE_GENERATED');
      expect(profile.globalAverage).toBe(3.5);
      expect(new Date(profile.computedAt).getTime()).toBe(
        new Date(before).getTime(),
      );
      const [{ state }] = await dataSource.query<{ state: string }[]>(
        `SELECT state FROM irl_diagnostic.diagnostic WHERE id = $1`,
        [completedId],
      );
      expect(state).toBe('PROFILE_GENERATED');
    });
  });

  describe('un diagnóstico ajeno o inexistente', () => {
    it.each([
      ['de otro usuario', () => othersCompletedId],
      ['que no existe', () => randomUUID()],
    ])('responde 404 al diagnóstico %s', async (_label, id) => {
      await agent.get(`/api/v1/diagnostics/${id()}`).expect(404);
      await agent.get(`/api/v1/diagnostics/${id()}/profile`).expect(404);
    });
  });
});
