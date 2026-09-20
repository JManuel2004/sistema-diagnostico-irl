import { beforeAll, afterAll, describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import request from 'supertest';
import nock from 'nock';
import { randomUUID } from 'node:crypto';
import {
  recommendationResponseSchema,
  roadmapResponseSchema,
} from '@innlab/contracts';
import { AppModule } from '../../../../src/app.module.js';
import { configureApp } from '../../../../src/shared/kernel/infrastructure/http/configure-app.js';
import { DeepAnalysisRequestedEvent } from '../../../../src/shared/kernel/events/deep-analysis-requested.event.js';
import { PortfolioRecommendationCalculatedEvent } from '../../../../src/shared/kernel/events/portfolio-recommendation-calculated.event.js';
import { ScalingRoadmapCalculatedEvent } from '../../../../src/shared/kernel/events/scaling-roadmap-calculated.event.js';
import {
  E2E_USER,
  authenticateAgainst,
} from '../../support/authenticated-app.js';

/**
 * E2E — caso de aceptación de AgroConecta a través del flujo por eventos.
 *
 * Aceptar el análisis profundo (`POST /diagnostics/:id/deep-analysis`)
 * publica `DeepAnalysisRequestedEvent`; `routing/` y `roadmap/` lo escuchan
 * cada uno por su cuenta y, al terminar, publican su evento "calculado".
 * Esta suite arranca el `AppModule` real y comprueba de punta a punta:
 *
 *   - que el evento llega a ambos listeners reales,
 *   - que cada módulo publica su propio evento "calculado",
 *   - que el resultado sigue siendo el de AgroConecta (Consultoría, con
 *     Mentoría y Proyectos Integradores como alternativas),
 *   - y que la recomendación existe sin haber llamado nunca al endpoint
 *     directo de `routing/`.
 *
 * Perfil de partida (SA-06): TRL 6, CRL 4, BRL 3, IPRL 1, TmRL 5, FRL 2.
 * Requiere la base migrada y sembrada.
 */
const ANSWERS_BY_DIMENSION: Record<string, number[]> = {
  TRL: [4, 3, 3, 3, 3, 3, 3, 3],
  CRL: [3, 2, 2, 2, 2, 2, 3, 3],
  BRL: [2, 2, 2, 2, 2, 2, 2, 2],
  IPRL: [2, 1, 1, 1, 1, 1, 1, 1],
  TmRL: [3, 3, 3, 3, 3, 3, 2, 2],
  FRL: [2, 2, 2, 2, 1, 1, 1, 1],
};

describe('Análisis profundo por eventos (e2e) — AgroConecta', () => {
  let app: NestFastifyApplication;
  let dataSource: DataSource;
  let agent: ReturnType<typeof request.agent>;
  const diagnosticId = randomUUID();
  const sinPerfil = randomUUID();

  const solicitado = jest.fn();
  const recomendacionCalculada = jest.fn();
  const roadmapCalculado = jest.fn();

  async function estadoDe(id: string): Promise<string> {
    const [row] = await dataSource.query<{ state: string }[]>(
      `SELECT state FROM irl_diagnostic.diagnostic WHERE id = $1`,
      [id],
    );
    return row.state;
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

    // Espías sobre el emisor real de la app: observan lo que los módulos
    // publican sin sustituir a ningún listener.
    const events = app.get(EventEmitter2);
    events.on(DeepAnalysisRequestedEvent.eventName, solicitado);
    events.on(
      PortfolioRecommendationCalculatedEvent.eventName,
      recomendacionCalculada,
    );
    events.on(ScalingRoadmapCalculatedEvent.eventName, roadmapCalculado);

    dataSource = app.get(DataSource);

    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic
         (id, keycloak_user_id, state, irl_framework_version)
       VALUES ($1, $2, 'QUESTIONNAIRE_IN_PROGRESS', 'KTH-IRL-1.0'),
              ($3, $2, 'QUESTIONNAIRE_IN_PROGRESS', 'KTH-IRL-1.0')`,
      [diagnosticId, E2E_USER.sub, sinPerfil],
    );
    await dataSource.query(
      `INSERT INTO irl_catalog.sector (name, is_active)
       VALUES ('Agroindustria', true)
       ON CONFLICT (name) DO NOTHING`,
    );
    await dataSource.query(
      `INSERT INTO irl_diagnostic.initiative
         (id, id_diagnostic, id_sector, name, short_description,
          id_stage, team_size, academic_linkage)
       SELECT $1, $2, s.id, 'AgroConecta',
              'Plataforma de trazabilidad y comercialización de café',
              e.id, 3, false
         FROM irl_catalog.sector s, irl_catalog.initiative_stage e
        WHERE s.name = 'Agroindustria' AND e.code = 'validacion'`,
      [randomUUID(), diagnosticId],
    );

    const statements = await dataSource.query<
      { id_statement: string; code: string; sequence: number }[]
    >(
      `SELECT a.id_statement, d.code, a.sequence
         FROM irl_catalog.statement a
         JOIN irl_catalog.dimension d ON d.id_dimension = a.id_dimension
        ORDER BY d.sequence, a.sequence`,
    );
    const answers = statements.map((a) => ({
      statementId: String(a.id_statement),
      value: ANSWERS_BY_DIMENSION[a.code][a.sequence - 1],
    }));

    await agent
      .post(`/api/v1/diagnostics/${diagnosticId}/finalize-initial`)
      .send({ answers })
      .expect(201);
  }, 60_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        `DELETE FROM irl_diagnostic.diagnostic WHERE id = ANY($1)`,
        [[diagnosticId, sinPerfil]],
      );
    }
    nock.cleanAll();
    await app?.close();
  });

  it('finalizar guarda el estado crítico solo en las dimensiones que RF-13 admite', async () => {
    // Perfil AgroConecta: en brecha (IRL ≤ 3) están BRL (3), IPRL (1) y FRL (2),
    // pero IPRL y FRL no reciben la alerta: solo BRL queda en estado crítico.
    const filas = await dataSource.query<{ code: string }[]>(
      `SELECT d.code
         FROM irl_diagnostic.dimension_result r
         JOIN irl_catalog.dimension d ON d.id_dimension = r.id_dimension
        WHERE r.id_diagnostic = $1 AND r.in_critical_state`,
      [diagnosticId],
    );

    expect(filas.map((f) => f.code)).toEqual(['BRL']);
  });

  it('antes de aceptar, no existe recomendación ni se ha publicado nada', async () => {
    expect(await estadoDe(diagnosticId)).toBe('PROFILE_GENERATED');
    expect(solicitado).not.toHaveBeenCalled();
    expect(recomendacionCalculada).not.toHaveBeenCalled();
    expect(roadmapCalculado).not.toHaveBeenCalled();

    const res = await agent
      .get(`/api/v1/diagnostics/${diagnosticId}/recommendation`)
      .expect(409);
    expect((res.body as { code: string }).code).toBe(
      'ROUTING_RECOMMENDATION_NOT_GENERATED',
    );
  });

  it('aceptar el análisis profundo publica el evento y ambos módulos publican el suyo', async () => {
    const res = await agent
      .post(`/api/v1/diagnostics/${diagnosticId}/deep-analysis`)
      .expect(201);

    expect(res.body).toEqual({
      diagnosticId,
      state: 'DEEP_ANALYSIS_IN_PROGRESS',
    });
    expect(await estadoDe(diagnosticId)).toBe('DEEP_ANALYSIS_IN_PROGRESS');

    const carga = { payload: { diagnosticId } };
    expect(solicitado).toHaveBeenCalledTimes(1);
    expect(solicitado).toHaveBeenCalledWith(expect.objectContaining(carga));
    // Los dos listeners reales corrieron: cada uno publicó su evento.
    expect(recomendacionCalculada).toHaveBeenCalledTimes(1);
    expect(recomendacionCalculada).toHaveBeenCalledWith(
      expect.objectContaining(carga),
    );
    expect(roadmapCalculado).toHaveBeenCalledTimes(1);
    expect(roadmapCalculado).toHaveBeenCalledWith(
      expect.objectContaining(carga),
    );
  });

  it('la recomendación existe y sigue siendo la de AgroConecta, sin llamar a routing/ directamente', async () => {
    const res = await agent
      .get(`/api/v1/diagnostics/${diagnosticId}/recommendation`)
      .expect(200);
    const dto = recommendationResponseSchema.parse(res.body);

    expect(dto.resultType).toBe('RECOMMENDATION');
    expect(dto.primary?.name).toBe('Consultoría');
    expect(dto.primary?.score).toBeCloseTo(5.55, 3);
    expect(dto.alternatives.map((a) => a.name)).toEqual([
      'Mentoría',
      'Proyectos Integradores',
    ]);
  });

  it('el roadmap se calcula para el mismo perfil, y leerlo no publica ningún evento', async () => {
    const antes = roadmapCalculado.mock.calls.length;

    const res = await agent
      .get(`/api/v1/diagnostics/${diagnosticId}/roadmap`)
      .expect(200);
    await agent.get(`/api/v1/diagnostics/${diagnosticId}/roadmap`).expect(200);

    expect(() => roadmapResponseSchema.parse(res.body)).not.toThrow();
    // Regresión 14.4: un GET no es un cálculo real.
    expect(roadmapCalculado.mock.calls.length).toBe(antes);
  });

  it('aceptar de nuevo no cambia el estado, vuelve a publicar y no acumula recomendaciones', async () => {
    const antes = {
      solicitado: solicitado.mock.calls.length,
      recomendacion: recomendacionCalculada.mock.calls.length,
      roadmap: roadmapCalculado.mock.calls.length,
    };

    await agent
      .post(`/api/v1/diagnostics/${diagnosticId}/deep-analysis`)
      .expect(201);

    expect(await estadoDe(diagnosticId)).toBe('DEEP_ANALYSIS_IN_PROGRESS');
    expect(solicitado.mock.calls.length).toBe(antes.solicitado + 1);
    expect(recomendacionCalculada.mock.calls.length).toBe(
      antes.recomendacion + 1,
    );
    expect(roadmapCalculado.mock.calls.length).toBe(antes.roadmap + 1);

    const [{ count }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count
         FROM irl_diagnostic.portfolio_recommendation
        WHERE id_diagnostic = $1`,
      [diagnosticId],
    );
    expect(count).toBe('1');
  });

  it('un diagnóstico sin perfil calculado responde 409 y no publica nada', async () => {
    const antes = solicitado.mock.calls.length;

    await agent
      .post(`/api/v1/diagnostics/${sinPerfil}/deep-analysis`)
      .expect(409);

    expect(solicitado.mock.calls.length).toBe(antes);
    expect(await estadoDe(sinPerfil)).toBe('QUESTIONNAIRE_IN_PROGRESS');
  });
});
