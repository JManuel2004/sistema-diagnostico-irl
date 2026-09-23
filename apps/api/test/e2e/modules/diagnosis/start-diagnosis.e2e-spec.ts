import { beforeAll, beforeEach, afterAll, describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
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
 * `POST /api/v1/diagnostics` hands the authenticated user a diagnostic in
 * `STARTED` (consent and initiative are the next steps) and is idempotent
 * while one is unfinished: it resumes it instead of creating another. Needs
 * the migrated database.
 *
 * The e2e suites run in parallel over the same database: this one uses its
 * own user so it never resumes another suite's diagnostic.
 */
describe('Iniciar diagnóstico (e2e)', () => {
  const userId = randomUUID();
  let app: NestFastifyApplication;
  let dataSource: DataSource;
  let agent: ReturnType<typeof request.agent>;

  async function cleanUp(): Promise<void> {
    await dataSource.query(`DELETE FROM irl_diagnostic.diagnostic WHERE cognito_user_id = $1`, [
      userId,
    ]);
  }

  async function start() {
    const res = await agent.post('/api/v1/diagnostics').expect(201);
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

    agent = request.agent(app.getHttpServer()).set('Authorization', authenticateAgainst(app, userId));
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

  it('el diagnóstico queda guardado y aparece en el listado del usuario', async () => {
    const { id } = await start();

    const list = await agent.get('/api/v1/diagnostics').expect(200);

    expect((list.body as { id: string }[]).map((d) => d.id)).toContain(id);
  });

  // Bug: each click created a new diagnostic and orphaned the previous one.
  describe('mientras haya un diagnóstico sin terminar', () => {
    it('lo reanuda en lugar de crear otro', async () => {
      const a = await start();
      const b = await start();
      const c = await start();

      expect(b.id).toBe(a.id);
      expect(c.id).toBe(a.id);
      expect(await countDiagnostics()).toBe(1);
    });

    it('lo devuelve en el estado en que quedó, no lo reinicia', async () => {
      const { id } = await start();
      await dataSource.query(
        `UPDATE irl_diagnostic.diagnostic SET state = 'WITH_INITIATIVE' WHERE id = $1`,
        [id],
      );

      const resumed = await start();

      expect(resumed.id).toBe(id);
      expect(resumed.state).toBe('WITH_INITIATIVE');
    });
  });

  describe('cuando el último diagnóstico ya tiene sus resultados', () => {
    it.each(['PROFILE_GENERATED', 'DEEP_ANALYSIS_COMPLETE'])(
      'crea uno nuevo si el anterior está en %s',
      async (state) => {
        const previous = await start();
        await dataSource.query(`UPDATE irl_diagnostic.diagnostic SET state = $2 WHERE id = $1`, [
          previous.id,
          state,
        ]);

        const fresh = await start();

        expect(fresh.id).not.toBe(previous.id);
        expect(fresh.state).toBe('STARTED');
        expect(await countDiagnostics()).toBe(2);
      },
    );
  });

  it('cada usuario reanuda el suyo', async () => {
    const other = randomUUID();
    const otherAgent = request
      .agent(app.getHttpServer())
      .set('Authorization', authenticateAgainst(app, other));
    const mine = await start();

    try {
      const res = await otherAgent.post('/api/v1/diagnostics').expect(201);
      expect(diagnosticSchema.parse(res.body).id).not.toBe(mine.id);
    } finally {
      await dataSource.query(`DELETE FROM irl_diagnostic.diagnostic WHERE cognito_user_id = $1`, [
        other,
      ]);
    }
  });

  it('sin token responde 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/diagnostics').expect(401);
  });
});
