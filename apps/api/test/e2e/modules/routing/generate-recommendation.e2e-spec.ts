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
  recommendationResponseSchema,
  layerTraceResponseSchema,
} from '@innlab/contracts';
import { AppModule } from '../../../../src/app.module.js';
import { configureApp } from '../../../../src/shared/kernel/infrastructure/http/configure-app.js';
import { authenticateAgainst } from '../../support/authenticated-app.js';
import { agroconectaAnswers } from '../../support/agroconecta-case.js';

/**
 * E2E — full portfolio routing run for AgroConecta.
 *
 * Needs the real database, migrated and seeded:
 *   pnpm --filter @innlab/api db:migration:run && db:seed
 *
 * Follows the pattern of the other e2e suites (real `AppModule` +
 * supertest against the configured database), not Testcontainers.
 *
 * The 48 answers are chosen to produce exactly the profile of the case.
 * With 8 answers per dimension and the SA-06 conversion table:
 *
 *   TRL  sum 26 → 3.250 → IRL 6      IPRL sum  9 → 1.125 → IRL 1
 *   CRL  sum 19 → 2.375 → IRL 4      TmRL sum 22 → 2.750 → IRL 5
 *   BRL  sum 15 → 1.875 → IRL 3      FRL  sum 13 → 1.625 → IRL 2
 */

describe('Enrutamiento de portafolio (e2e) — AgroConecta', () => {
  let app: NestFastifyApplication;
  let dataSource: DataSource;
  let diagnosticId: string;
  // Agent with the Authorization header by default: the global guard
  // rejects any request without a token.
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Same adapter and same pipeline as `main.ts`, so the suite runs the
    // pipeline that gets deployed.
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
    diagnosticId = randomUUID();

    // ── Diagnostic and initiative characterization ─────────────────────
    //
    // Inserted directly: this suite tests the routing, not the consent and
    // initiative flow, which `initiative/registration-flow` covers.
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic
         (id, cognito_user_id, state, irl_framework_version)
       VALUES ($1, 'usuario-e2e', 'QUESTIONNAIRE_IN_PROGRESS', 'KTH-IRL-1.0')`,
      [diagnosticId],
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

    // ── Questionnaire + maturity profile ──────────────────────────────
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
        `DELETE FROM irl_diagnostic.diagnostic WHERE id = $1`,
        [diagnosticId],
      );
    }
    nock.cleanAll();
    await app?.close();
  });

  it('el perfil de partida es el de AgroConecta', async () => {
    const res = await agent
      .get(`/api/v1/diagnostics/${diagnosticId}/profile`)
      .expect(200);

    const profile = res.body as {
      dimensionResults: { dimensionCode: string; irlLevel: number }[];
    };
    const levels = Object.fromEntries(
      profile.dimensionResults.map((r) => [r.dimensionCode, r.irlLevel]),
    );
    expect(levels).toEqual({
      TRL: 6,
      CRL: 4,
      BRL: 3,
      IPRL: 1,
      TmRL: 5,
      FRL: 2,
    });
  });

  it('aceptar el análisis profundo genera Consultoría con sus dos alternatives', async () => {
    // The recommendation is no longer generated by its own POST: `routing/`
    // calculates it when it reacts to the acceptance of the deep analysis.
    await agent
      .post(`/api/v1/diagnostics/${diagnosticId}/deep-analysis`)
      .expect(201);

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
    expect(dto.alternatives.map((a) => a.position)).toEqual([2, 3]);
  });

  it('la justificación cita el reason declarado del ajuste que decidió el puesto', () => {
    return agent
      .get(`/api/v1/diagnostics/${diagnosticId}/recommendation`)
      .expect(200)
      .expect((res) => {
        const dto = recommendationResponseSchema.parse(res.body);
        expect(dto.justification).toContain('riesgo legal crítico');
      });
  });

  it('GET /recommendation/trace expone las tres layers y atribuye el resultado a E-01', async () => {
    const res = await agent
      .get(`/api/v1/diagnostics/${diagnosticId}/recommendation/trace`)
      .expect(200);

    const trace = layerTraceResponseSchema.parse(res.body);

    // Layer 1
    expect(trace.layer1Excluded.map((e) => e.name)).toEqual([
      'Proyectos de Grado',
    ]);

    // Layer 2 — the ranking of the pure calculation, before any adjustment
    expect(trace.rankingBeforeExceptions.map((r) => r.name)).toEqual([
      'Consultoría',
      'Mentoría',
      'Proyectos Integradores',
      'Formación',
      'Retos en el Aula',
    ]);

    // Layer 3 — which adjustment fired, which did not, and why
    expect(trace.appliedExceptions.map((e) => e.code)).toEqual(['E-01']);
    expect(trace.discardedExceptions.map((e) => e.code)).toEqual([
      'E-02',
      'E-03',
    ]);
    expect(trace.appliedExceptions[0].rankingBefore[0].name).toBe(
      'Consultoría',
    );
    expect(trace.appliedExceptions[0].rankingAfter[0].name).toBe(
      'Consultoría',
    );

    // Consultoría won the calculation and was also pinned: the result is NOT
    // due to an adjustment displacing the winner.
    expect(trace.adjustedByException).toBe(false);

    // The characterization is complete in this case, so there is no
    // silent degradation to record.
    expect(trace.incompleteCharacterization).toEqual([]);

    expect(trace.factsHash).toHaveLength(64);
  });

  it('volver a aceptar el análisis profundo es idempotente y no acumula filas', async () => {
    await agent
      .post(`/api/v1/diagnostics/${diagnosticId}/deep-analysis`)
      .expect(201);

    const [{ count }] = await dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*)::text AS count
         FROM irl_diagnostic.portfolio_recommendation
        WHERE id_diagnostic = $1`,
      [diagnosticId],
    );
    expect(count).toBe('1');
  });

  it('un diagnóstico sin recomendación generada devuelve 409, no 404', async () => {
    const other = randomUUID();
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic
         (id, cognito_user_id, state, irl_framework_version)
       VALUES ($1, 'usuario-e2e', 'QUESTIONNAIRE_IN_PROGRESS', 'KTH-IRL-1.0')`,
      [other],
    );

    try {
      const res = await agent
        .get(`/api/v1/diagnostics/${other}/recommendation`)
        .expect(409);
      expect((res.body as { code: string }).code).toBe(
        'ROUTING_RECOMMENDATION_NOT_GENERATED',
      );
    } finally {
      await dataSource.query(
        `DELETE FROM irl_diagnostic.diagnostic WHERE id = $1`,
        [other],
      );
    }
  });
});
