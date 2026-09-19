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

/**
 * E2E — consentimiento (RF-03) y registro de iniciativa (RF-04) contra el
 * `AppModule` real.
 *
 * Cubre lo que los tests unitarios no pueden: que el evento
 * `ConsentRecordedEvent` publicado por `initiative/` llegue de verdad al
 * listener de `diagnosis/` y mueva el estado del diagnóstico en la base, y
 * que la verificación de propiedad rechace diagnósticos ajenos o
 * inexistentes antes de escribir nada.
 *
 * Requiere la base migrada y sembrada. Crea sus propios datos con
 * identificadores aleatorios y los borra al terminar.
 */
describe('Consentimiento e iniciativa (e2e)', () => {
  let app: NestFastifyApplication;
  let dataSource: DataSource;
  let agent: ReturnType<typeof request.agent>;
  let sectorId: string;

  const propio = randomUUID();
  const propioSinConsentir = randomUUID();
  const ajeno = randomUUID();
  const inexistente = randomUUID();

  async function crearDiagnostico(id: string, userId: string): Promise<void> {
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic
         (id, keycloak_user_id, state, irl_framework_version)
       VALUES ($1, $2, 'STARTED', 'KTH-IRL-1.0')`,
      [id, userId],
    );
  }

  async function estadoDe(id: string): Promise<string> {
    const [row] = await dataSource.query<{ state: string }[]>(
      `SELECT state FROM irl_diagnostic.diagnostic WHERE id = $1`,
      [id],
    );
    return row.state;
  }

  async function contar(tabla: string, id: string): Promise<number> {
    const [row] = await dataSource.query<{ n: string }[]>(
      `SELECT COUNT(*)::text AS n FROM irl_diagnostic.${tabla} WHERE id_diagnostic = $1`,
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
    await crearDiagnostico(propio, E2E_USER.sub);
    await crearDiagnostico(propioSinConsentir, E2E_USER.sub);
    await crearDiagnostico(ajeno, 'otro-usuario');

    await dataSource.query(
      `INSERT INTO irl_catalog.sector (name, is_active)
       VALUES ('Agroindustria', true)
       ON CONFLICT (name) DO NOTHING`,
    );
    const [sector] = await dataSource.query<{ id: string }[]>(
      `SELECT id::text AS id FROM irl_catalog.sector WHERE name = 'Agroindustria'`,
    );
    sectorId = sector.id;
  }, 60_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      for (const id of [propio, propioSinConsentir, ajeno]) {
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
      expect(await estadoDe(propio)).toBe('STARTED');

      const res = await agent
        .post(`/api/v1/diagnostics/${propio}/consent`)
        .send({ version: 'v1' })
        .expect(201);

      expect((res.body as { diagnosticId: string }).diagnosticId).toBe(propio);
      expect(await estadoDe(propio)).toBe('WITH_CONSENT');
      expect(await contar('consent', propio)).toBe(1);

      await agent.get(`/api/v1/diagnostics/${propio}/consent`).expect(200);
    });

    it('registrarlo de nuevo es idempotente en el estado', async () => {
      await agent
        .post(`/api/v1/diagnostics/${propio}/consent`)
        .send({ version: 'v1' })
        .expect(201);

      expect(await estadoDe(propio)).toBe('WITH_CONSENT');
    });

    it('rechaza con 403 un diagnóstico ajeno y no escribe nada', async () => {
      await agent
        .post(`/api/v1/diagnostics/${ajeno}/consent`)
        .send({ version: 'v1' })
        .expect(403);

      expect(await contar('consent', ajeno)).toBe(0);
      expect(await estadoDe(ajeno)).toBe('STARTED');
    });

    it('rechaza con 404 un diagnóstico que no existe', async () => {
      await agent
        .post(`/api/v1/diagnostics/${inexistente}/consent`)
        .send({ version: 'v1' })
        .expect(404);
    });

    it('rechaza con 409 una versión de términos desactualizada, sin avanzar el estado', async () => {
      await agent
        .post(`/api/v1/diagnostics/${propioSinConsentir}/consent`)
        .send({ version: 'v0-vieja' })
        .expect(409);

      expect(await contar('consent', propioSinConsentir)).toBe(0);
      expect(await estadoDe(propioSinConsentir)).toBe('STARTED');
    });
  });

  describe('registro de iniciativa', () => {
    const cuerpo = () => ({
      sectorId,
      name: 'AgroConecta',
      shortDescription: 'Plataforma de trazabilidad de café',
    });

    it('registra la iniciativa de un diagnóstico propio', async () => {
      const res = await agent
        .post(`/api/v1/diagnostics/${propio}/initiative`)
        .send(cuerpo())
        .expect(201);

      expect((res.body as { diagnosticId: string }).diagnosticId).toBe(propio);
      expect(await contar('initiative', propio)).toBe(1);
    });

    it('rechaza con 403 un diagnóstico ajeno y no escribe nada', async () => {
      await agent
        .post(`/api/v1/diagnostics/${ajeno}/initiative`)
        .send(cuerpo())
        .expect(403);

      expect(await contar('initiative', ajeno)).toBe(0);
    });

    it('rechaza con 404 un diagnóstico que no existe', async () => {
      await agent
        .post(`/api/v1/diagnostics/${inexistente}/initiative`)
        .send(cuerpo())
        .expect(404);
    });
  });
});
