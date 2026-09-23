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
import { agroconectaAnswers } from '../../support/agroconecta-case.js';

/**
 * E2E — AgroConecta acceptance case through the event flow.
 *
 * Accepting the deep analysis (`POST /diagnostics/:id/deep-analysis`)
 * publishes `DeepAnalysisRequestedEvent`; `routing/` and `roadmap/` each
 * listen on their own and, when done, publish their "calculated" event.
 * This suite boots the real `AppModule` and checks end to end:
 *
 *   - that the event reaches both real listeners,
 *   - that each module publishes its own "calculated" event,
 *   - that the result is still AgroConecta's (Consultoría, with Mentoría
 *     and Proyectos Integradores as alternatives),
 *   - and that the recommendation exists without ever calling a direct
 *     endpoint of `routing/`.
 *
 * Starting profile (SA-06): TRL 6, CRL 4, BRL 3, IPRL 1, TmRL 5, FRL 2.
 * Needs the migrated and seeded database.
 */
describe('Análisis profundo por eventos (e2e) — AgroConecta', () => {
  let app: NestFastifyApplication;
  let dataSource: DataSource;
  let agent: ReturnType<typeof request.agent>;
  const diagnosticId = randomUUID();
  const withoutProfile = randomUUID();

  const requested = jest.fn();
  const recommendationCalculated = jest.fn();
  const roadmapCalculated = jest.fn();

  async function stateOf(id: string): Promise<string> {
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

    // Spies on the app's real emitter: they observe what the modules
    // publish without replacing any listener.
    const events = app.get(EventEmitter2);
    events.on(DeepAnalysisRequestedEvent.eventName, requested);
    events.on(
      PortfolioRecommendationCalculatedEvent.eventName,
      recommendationCalculated,
    );
    events.on(ScalingRoadmapCalculatedEvent.eventName, roadmapCalculated);

    dataSource = app.get(DataSource);

    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic
         (id, cognito_user_id, state, irl_framework_version)
       VALUES ($1, $2, 'QUESTIONNAIRE_IN_PROGRESS', 'KTH-IRL-1.0'),
              ($3, $2, 'QUESTIONNAIRE_IN_PROGRESS', 'KTH-IRL-1.0')`,
      [diagnosticId, E2E_USER.sub, withoutProfile],
    );
    await dataSource.query(
      `INSERT INTO irl_catalog.sector (name, is_active)
       VALUES ('Agroindustria', true)
       ON CONFLICT (name) DO NOTHING`,
    );
    await dataSource.query(
      `INSERT INTO irl_diagnostic.initiative
         (id, id_diagnostic, id_sector, name, product_type,
          id_stage, declared_stage, team_size, team_description,
          academic_linkage, target_market, current_funding)
       SELECT $1, $2, s.id, 'AgroConecta',
              'Plataforma de trazabilidad y comercialización de café',
              e.id, 'Piloto completado', 3, 'Fundadora, coordinadora y desarrollador externo',
              false, 'Productores de café del suroccidente', 'Ahorros de la fundadora'
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
    const answers = agroconectaAnswers(statements);

    await agent
      .post(`/api/v1/diagnostics/${diagnosticId}/finalize-initial`)
      .send({ answers })
      .expect(201);
  }, 60_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        `DELETE FROM irl_diagnostic.diagnostic WHERE id = ANY($1)`,
        [[diagnosticId, withoutProfile]],
      );
    }
    nock.cleanAll();
    await app?.close();
  });

  it('finalizar guarda el estado crítico solo en las dimensiones que RF-13 admite', async () => {
    // AgroConecta profile: BRL (3), IPRL (1) and FRL (2) are in gap (IRL ≤ 3),
    // but IPRL and FRL do not get the alert: only BRL is in critical state.
    const rows = await dataSource.query<{ code: string }[]>(
      `SELECT d.code
         FROM irl_diagnostic.dimension_result r
         JOIN irl_catalog.dimension d ON d.id_dimension = r.id_dimension
        WHERE r.id_diagnostic = $1 AND r.in_critical_state`,
      [diagnosticId],
    );

    expect(rows.map((f) => f.code)).toEqual(['BRL']);
  });

  it('antes de aceptar, no existe recomendación ni se ha publicado nada', async () => {
    expect(await stateOf(diagnosticId)).toBe('PROFILE_GENERATED');
    expect(requested).not.toHaveBeenCalled();
    expect(recommendationCalculated).not.toHaveBeenCalled();
    expect(roadmapCalculated).not.toHaveBeenCalled();

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
    expect(await stateOf(diagnosticId)).toBe('DEEP_ANALYSIS_IN_PROGRESS');

    const eventPayload = { payload: { diagnosticId } };
    expect(requested).toHaveBeenCalledTimes(1);
    expect(requested).toHaveBeenCalledWith(
      expect.objectContaining(eventPayload),
    );
    // Both real listeners ran: each one published its event.
    expect(recommendationCalculated).toHaveBeenCalledTimes(1);
    expect(recommendationCalculated).toHaveBeenCalledWith(
      expect.objectContaining(eventPayload),
    );
    expect(roadmapCalculated).toHaveBeenCalledTimes(1);
    expect(roadmapCalculated).toHaveBeenCalledWith(
      expect.objectContaining(eventPayload),
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
    const before = roadmapCalculated.mock.calls.length;

    const res = await agent
      .get(`/api/v1/diagnostics/${diagnosticId}/roadmap`)
      .expect(200);
    await agent.get(`/api/v1/diagnostics/${diagnosticId}/roadmap`).expect(200);

    expect(() => roadmapResponseSchema.parse(res.body)).not.toThrow();
    // Regression: a GET is not a real calculation.
    expect(roadmapCalculated.mock.calls.length).toBe(before);
  });

  it('aceptar de nuevo no cambia el estado, vuelve a publicar y no acumula recomendaciones', async () => {
    const before = {
      requested: requested.mock.calls.length,
      recommendation: recommendationCalculated.mock.calls.length,
      roadmap: roadmapCalculated.mock.calls.length,
    };

    await agent
      .post(`/api/v1/diagnostics/${diagnosticId}/deep-analysis`)
      .expect(201);

    expect(await stateOf(diagnosticId)).toBe('DEEP_ANALYSIS_IN_PROGRESS');
    expect(requested.mock.calls.length).toBe(before.requested + 1);
    expect(recommendationCalculated.mock.calls.length).toBe(
      before.recommendation + 1,
    );
    expect(roadmapCalculated.mock.calls.length).toBe(before.roadmap + 1);

    const [{ count }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count
         FROM irl_diagnostic.portfolio_recommendation
        WHERE id_diagnostic = $1`,
      [diagnosticId],
    );
    expect(count).toBe('1');
  });

  it('un diagnóstico sin perfil calculado responde 409 y no publica nada', async () => {
    const before = requested.mock.calls.length;

    await agent
      .post(`/api/v1/diagnostics/${withoutProfile}/deep-analysis`)
      .expect(409);

    expect(requested.mock.calls.length).toBe(before);
    expect(await stateOf(withoutProfile)).toBe('QUESTIONNAIRE_IN_PROGRESS');
  });
});
