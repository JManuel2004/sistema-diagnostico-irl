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
 * E2E — iniciar un diagnóstico (HU-04).
 *
 * `POST /api/v1/diagnostics` entrega al usuario autenticado un diagnóstico en
 * `STARTED` (el consentimiento y la iniciativa son los pasos siguientes) y es
 * idempotente mientras haya uno sin terminar: lo reanuda en lugar de crear
 * otro. Requiere la base migrada.
 *
 * Las suites e2e corren en paralelo sobre la misma base: esta usa un usuario
 * propio para no reanudar el diagnóstico de otra.
 */
describe('Iniciar diagnóstico (e2e)', () => {
  const userId = randomUUID();
  let app: NestFastifyApplication;
  let dataSource: DataSource;
  let agent: ReturnType<typeof request.agent>;

  async function limpiar(): Promise<void> {
    await dataSource.query(`DELETE FROM irl_diagnostic.diagnostic WHERE cognito_user_id = $1`, [
      userId,
    ]);
  }

  async function iniciar() {
    const res = await agent.post('/api/v1/diagnostics').expect(201);
    return diagnosticSchema.parse(res.body);
  }

  async function contar(): Promise<number> {
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
    await limpiar();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await limpiar();
    nock.cleanAll();
    await app?.close();
  });

  it('crea un diagnóstico del usuario autenticado, al comienzo del recorrido', async () => {
    const diagnostic = await iniciar();

    expect(diagnostic.userId).toBe(userId);
    expect(diagnostic.state).toBe('STARTED');
    expect(diagnostic.completed).toBe(false);
  });

  it('el diagnóstico queda guardado y aparece en el listado del usuario', async () => {
    const { id } = await iniciar();

    const list = await agent.get('/api/v1/diagnostics').expect(200);

    expect((list.body as { id: string }[]).map((d) => d.id)).toContain(id);
  });

  // Bug: cada clic creaba un diagnóstico nuevo y dejaba huérfano el anterior.
  describe('mientras haya un diagnóstico sin terminar', () => {
    it('lo reanuda en lugar de crear otro', async () => {
      const a = await iniciar();
      const b = await iniciar();
      const c = await iniciar();

      expect(b.id).toBe(a.id);
      expect(c.id).toBe(a.id);
      expect(await contar()).toBe(1);
    });

    it('lo devuelve en el estado en que quedó, no lo reinicia', async () => {
      const { id } = await iniciar();
      await dataSource.query(
        `UPDATE irl_diagnostic.diagnostic SET state = 'WITH_INITIATIVE' WHERE id = $1`,
        [id],
      );

      const reanudado = await iniciar();

      expect(reanudado.id).toBe(id);
      expect(reanudado.state).toBe('WITH_INITIATIVE');
    });
  });

  describe('cuando el último diagnóstico ya tiene sus resultados', () => {
    it.each(['PROFILE_GENERATED', 'DEEP_ANALYSIS_COMPLETE'])(
      'crea uno nuevo si el anterior está en %s',
      async (state) => {
        const anterior = await iniciar();
        await dataSource.query(`UPDATE irl_diagnostic.diagnostic SET state = $2 WHERE id = $1`, [
          anterior.id,
          state,
        ]);

        const nuevo = await iniciar();

        expect(nuevo.id).not.toBe(anterior.id);
        expect(nuevo.state).toBe('STARTED');
        expect(await contar()).toBe(2);
      },
    );
  });

  it('cada usuario reanuda el suyo', async () => {
    const otro = randomUUID();
    const agentOtro = request
      .agent(app.getHttpServer())
      .set('Authorization', authenticateAgainst(app, otro));
    const mio = await iniciar();

    try {
      const res = await agentOtro.post('/api/v1/diagnostics').expect(201);
      expect(diagnosticSchema.parse(res.body).id).not.toBe(mio.id);
    } finally {
      await dataSource.query(`DELETE FROM irl_diagnostic.diagnostic WHERE cognito_user_id = $1`, [
        otro,
      ]);
    }
  });

  it('sin token responde 401', async () => {
    await request(app.getHttpServer()).post('/api/v1/diagnostics').expect(401);
  });
});
