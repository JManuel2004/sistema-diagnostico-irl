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
import { AppModule } from '../../../../src/app.module.js';
import { configureApp } from '../../../../src/shared/kernel/infrastructure/http/configure-app.js';
import {
  E2E_USER,
  authenticateAgainst,
} from '../../support/authenticated-app.js';
import { agroconectaInitiative } from '../../support/agroconecta-case.js';

/**
 * E2E — consent (RF-03) and initiative registration (RF-04) against the
 * real `AppModule`.
 *
 * Covers what the unit tests cannot: that the `ConsentRecordedEvent`
 * published by `initiative/` really reaches `diagnosis/`'s listener and
 * moves the diagnostic's state in the database, and that the ownership
 * check rejects foreign or missing diagnostics before writing anything.
 *
 * Needs the migrated and seeded database. Creates its own data with random
 * identifiers and deletes it when done.
 */
describe('Consentimiento e iniciativa (e2e)', () => {
  let app: NestFastifyApplication;
  let dataSource: DataSource;
  let agent: ReturnType<typeof request.agent>;
  let sectorId: string;
  let stageId: string;

  const own = randomUUID();
  const ownWithoutConsent = randomUUID();
  const foreign = randomUUID();
  const missing = randomUUID();

  async function createDiagnostic(id: string, userId: string): Promise<void> {
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic
         (id, cognito_user_id, state, irl_framework_version)
       VALUES ($1, $2, 'STARTED', 'KTH-IRL-1.0')`,
      [id, userId],
    );
  }

  async function stateOf(id: string): Promise<string> {
    const [row] = await dataSource.query<{ state: string }[]>(
      `SELECT state FROM irl_diagnostic.diagnostic WHERE id = $1`,
      [id],
    );
    return row.state;
  }

  async function countDiagnostics(table: string, id: string): Promise<number> {
    const [row] = await dataSource.query<{ n: string }[]>(
      `SELECT COUNT(*)::text AS n FROM irl_diagnostic.${table} WHERE id_diagnostic = $1`,
      [id],
    );
    return Number(row.n);
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
      .set('Authorization', authenticateAgainst(app));

    dataSource = app.get(DataSource);
    await createDiagnostic(own, E2E_USER.sub);
    await createDiagnostic(ownWithoutConsent, E2E_USER.sub);
    await createDiagnostic(foreign, 'otro-usuario');

    await dataSource.query(
      `INSERT INTO irl_catalog.sector (name, is_active)
       VALUES ('Agroindustria', true)
       ON CONFLICT (name) DO NOTHING`,
    );
    const [sector] = await dataSource.query<{ id: string }[]>(
      `SELECT id::text AS id FROM irl_catalog.sector WHERE name = 'Agroindustria'`,
    );
    sectorId = sector.id;
    const [stage] = await dataSource.query<{ id: string }[]>(
      `SELECT id::text AS id FROM irl_catalog.initiative_stage WHERE code = 'validacion'`,
    );
    stageId = stage.id;
  }, 60_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      for (const id of [own, ownWithoutConsent, foreign]) {
        await dataSource.query(
          `DELETE FROM irl_diagnostic.consent WHERE id_diagnostic = $1`,
          [id],
        );
        await dataSource.query(
          `DELETE FROM irl_diagnostic.initiative WHERE id_diagnostic = $1`,
          [id],
        );
        await dataSource.query(
          `DELETE FROM irl_diagnostic.diagnostic WHERE id = $1`,
          [id],
        );
      }
    }
    nock.cleanAll();
    await app?.close();
  });

  describe('consentimiento', () => {
    it('registrarlo mueve el diagnóstico de STARTED a WITH_CONSENT', async () => {
      expect(await stateOf(own)).toBe('STARTED');

      const res = await agent
        .post(`/api/v1/diagnostics/${own}/consent`)
        .send({ version: 'v1' })
        .expect(201);

      expect((res.body as { diagnosticId: string }).diagnosticId).toBe(own);
      expect(await stateOf(own)).toBe('WITH_CONSENT');
      expect(await countDiagnostics('consent', own)).toBe(1);

      await agent.get(`/api/v1/diagnostics/${own}/consent`).expect(200);
    });

    it('registrarlo de nuevo es idempotente en el estado', async () => {
      await agent
        .post(`/api/v1/diagnostics/${own}/consent`)
        .send({ version: 'v1' })
        .expect(201);

      expect(await stateOf(own)).toBe('WITH_CONSENT');
    });

    it('rechaza con 403 un diagnóstico ajeno y no escribe nada', async () => {
      await agent
        .post(`/api/v1/diagnostics/${foreign}/consent`)
        .send({ version: 'v1' })
        .expect(403);

      expect(await countDiagnostics('consent', foreign)).toBe(0);
      expect(await stateOf(foreign)).toBe('STARTED');
    });

    it('rechaza con 404 un diagnóstico que no existe', async () => {
      await agent
        .post(`/api/v1/diagnostics/${missing}/consent`)
        .send({ version: 'v1' })
        .expect(404);
    });

    it('rechaza con 409 una versión de términos desactualizada, sin avanzar el estado', async () => {
      await agent
        .post(`/api/v1/diagnostics/${ownWithoutConsent}/consent`)
        .send({ version: 'v0' })
        .expect(409);

      expect(await countDiagnostics('consent', ownWithoutConsent)).toBe(0);
      expect(await stateOf(ownWithoutConsent)).toBe('STARTED');
    });

    it('rechaza con 422 una versión que no cumple el formato del contrato', async () => {
      await agent
        .post(`/api/v1/diagnostics/${ownWithoutConsent}/consent`)
        .send({ version: 'v0-vieja' })
        .expect(422);

      expect(await countDiagnostics('consent', ownWithoutConsent)).toBe(0);
    });
  });

  describe('registro de iniciativa', () => {
    const initiativeBody = () => agroconectaInitiative({ sectorId, stageId });

    it('registra la iniciativa de un diagnóstico propio', async () => {
      const res = await agent
        .post(`/api/v1/diagnostics/${own}/initiative`)
        .send(initiativeBody())
        .expect(201);

      expect((res.body as { diagnosticId: string }).diagnosticId).toBe(own);
      expect(await countDiagnostics('initiative', own)).toBe(1);
      // `diagnosis/` reacts to the event and moves the diagnostic on.
      expect(await stateOf(own)).toBe('WITH_INITIATIVE');
    });

    it('rechaza con 403 un diagnóstico ajeno y no escribe nada', async () => {
      await agent
        .post(`/api/v1/diagnostics/${foreign}/initiative`)
        .send(initiativeBody())
        .expect(403);

      expect(await countDiagnostics('initiative', foreign)).toBe(0);
    });

    it('rechaza con 404 un diagnóstico que no existe', async () => {
      await agent
        .post(`/api/v1/diagnostics/${missing}/initiative`)
        .send(initiativeBody())
        .expect(404);
    });
  });
});
