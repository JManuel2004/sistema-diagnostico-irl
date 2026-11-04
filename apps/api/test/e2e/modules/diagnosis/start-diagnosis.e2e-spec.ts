import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  expect,
  it,
} from '@jest/globals';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import request from 'supertest';
import nock from 'nock';
import { randomUUID } from 'node:crypto';
import { diagnosticSchema } from '@innlab/contracts';
import { AppModule } from '../../../../src/app.module.js';
import { configureApp } from '../../../../src/shared/kernel/infrastructure/http/configure-app.js';
import { authenticateAgainst } from '../../support/authenticated-app.js';

/**
 * E2E — start a diagnostic (HU-04).
 *
 * `POST /api/v1/diagnostics` hands the authenticated user a new diagnostic
 * in `STARTED` (consent and initiative are the next steps). An unfinished
 * one keeps its draft on the server, so starting another asks first: 409
 * `DIAGNOSIS_IN_PROGRESS`, and only with `discardInProgress=true` is the
 * unfinished one deleted. Completed diagnostics stay. Needs the migrated
 * database.
 *
 * The e2e suites run in parallel over the same database: this one uses its
 * own user so it never touches another suite's diagnostic.
 */
describe('Iniciar diagnóstico (e2e)', () => {
  const userId = randomUUID();
  let app: NestFastifyApplication;
  let dataSource: DataSource;
  let agent: ReturnType<typeof request.agent>;

  async function cleanUp(): Promise<void> {
    await dataSource.query(
      `DELETE FROM irl_diagnostic.diagnostic WHERE cognito_user_id = $1`,
      [userId],
    );
  }

  async function start(query = '') {
    const res = await agent.post(`/api/v1/diagnostics${query}`).expect(201);
    return diagnosticSchema.parse(res.body);
  }

  async function countDiagnostics(): Promise<number> {
    const [{ count }] = await dataSource.query<{ count: string }[]>(
      `SELECT count(*) FROM irl_diagnostic.diagnostic WHERE cognito_user_id = $1`,
      [userId],
    );
    return Number(count);
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

    agent = request
      .agent(app.getHttpServer())
      .set('Authorization', authenticateAgainst(app, userId));
    dataSource = app.get(DataSource);
  }, 60_000);

  beforeEach(async () => {
    await cleanUp();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await cleanUp();
    nock.cleanAll();
    await app?.close();
  });

  it('crea un diagnóstico del usuario autenticado, al comienzo del recorrido', async () => {
    const diagnostic = await start();

    expect(diagnostic.userId).toBe(userId);
    expect(diagnostic.state).toBe('STARTED');
    expect(diagnostic.completed).toBe(false);
  });

  it('el diagnóstico queda guardado, pero no se lista mientras no tenga perfil', async () => {
    const { id } = await start();

    const list = await agent.get('/api/v1/diagnostics').expect(200);

    expect(await countDiagnostics()).toBe(1);
    expect((list.body as { id: string }[]).map((d) => d.id)).not.toContain(id);
  });

  describe('si hay un diagnóstico sin terminar', () => {
    it.each(['STARTED', 'WITH_INITIATIVE', 'QUESTIONNAIRE_IN_PROGRESS'])(
      'pregunta antes: responde 409 y no elimina nada (estaba en %s)',
      async (state) => {
        const previous = await start();
        await dataSource.query(
          `UPDATE irl_diagnostic.diagnostic SET state = $2 WHERE id = $1`,
          [previous.id, state],
        );

        const res = await agent.post('/api/v1/diagnostics').expect(409);

        expect((res.body as { code: string }).code).toBe(
          'DIAGNOSIS_IN_PROGRESS',
        );
        expect(await countDiagnostics()).toBe(1);
      },
    );

    it('se ofrece para continuarlo, y con la decisión de descartarlo lo elimina y crea uno nuevo', async () => {
      const previous = await start();
      await dataSource.query(
        `UPDATE irl_diagnostic.diagnostic SET state = 'WITH_INITIATIVE' WHERE id = $1`,
        [previous.id],
      );

      const offered = await agent
        .get('/api/v1/diagnostics/in-progress')
        .expect(200);
      expect(diagnosticSchema.parse(offered.body).id).toBe(previous.id);

      const fresh = await start('?discardInProgress=true');

      expect(fresh.id).not.toBe(previous.id);
      expect(fresh.state).toBe('STARTED');
      expect(await countDiagnostics()).toBe(1);
    });
  });

  it('sin diagnóstico en curso, consultarlo responde 404', async () => {
    await agent.get('/api/v1/diagnostics/in-progress').expect(404);
  });

  describe('cuando ya tiene diagnósticos con resultados', () => {
    it.each(['PROFILE_GENERATED', 'DEEP_ANALYSIS_COMPLETE'])(
      'crea uno nuevo y conserva el anterior en %s',
      async (state) => {
        const previous = await start();
        await dataSource.query(
          `UPDATE irl_diagnostic.diagnostic SET state = $2 WHERE id = $1`,
          [previous.id, state],
        );

        const fresh = await start();

        expect(fresh.id).not.toBe(previous.id);
        expect(fresh.state).toBe('STARTED');
        expect(await countDiagnostics()).toBe(2);
      },
    );
  });

  it('iniciar uno nuevo no elimina el diagnóstico sin terminar de otro usuario', async () => {
    const other = randomUUID();
    const otherAgent = request
      .agent(app.getHttpServer())
      .set('Authorization', authenticateAgainst(app, other));
    const mine = await start();

    try {
      // Someone else's diagnostic in progress is not offered to this user.
      await otherAgent.get('/api/v1/diagnostics/in-progress').expect(404);
      const res = await otherAgent.post('/api/v1/diagnostics').expect(201);
      expect(diagnosticSchema.parse(res.body).id).not.toBe(mine.id);
      expect(await countDiagnostics()).toBe(1);
    } finally {
      await dataSource.query(
        `DELETE FROM irl_diagnostic.diagnostic WHERE cognito_user_id = $1`,
        [other],
      );
    }
  });

  it('sin token responde 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/diagnostics').expect(401);
  });
});
