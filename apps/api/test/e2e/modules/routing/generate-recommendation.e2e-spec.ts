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

/**
 * E2E — recorrido completo de enrutamiento al portafolio para AgroConecta.
 *
 * Requiere la base de datos real, migrada y sembrada:
 *   pnpm --filter @innlab/api db:migration:run && db:seed
 *
 * Sigue el patrón de la suite e2e existente (`AppModule` real + supertest
 * contra la base configurada), no Testcontainers. Migrarla sería una
 * mejora, pero cambiar el patrón de las pruebas e2e es una decisión
 * aparte de este trabajo.
 *
 * Las 48 respuestas están calculadas para producir exactamente el perfil
 * del caso. Con 8 respuestas por dimensión y la tabla de conversión SA-06:
 *
 *   TRL  suma 25 → 3.125 → IRL 6      IPRL suma  9 → 1.125 → IRL 1
 *   CRL  suma 19 → 2.375 → IRL 4      TmRL suma 22 → 2.750 → IRL 5
 *   BRL  suma 16 → 2.000 → IRL 3      FRL  suma 12 → 1.500 → IRL 2
 */

const ANSWERS_BY_DIMENSION: Record<string, number[]> = {
  TRL: [4, 3, 3, 3, 3, 3, 3, 3],
  CRL: [3, 2, 2, 2, 2, 2, 3, 3],
  BRL: [2, 2, 2, 2, 2, 2, 2, 2],
  IPRL: [2, 1, 1, 1, 1, 1, 1, 1],
  TmRL: [3, 3, 3, 3, 3, 3, 2, 2],
  FRL: [2, 2, 2, 2, 1, 1, 1, 1],
};

describe('Enrutamiento de portafolio (e2e) — AgroConecta', () => {
  let app: NestFastifyApplication;
  let dataSource: DataSource;
  let diagnosticId: string;
  // Agente con la cabecera Authorization por defecto: el guard global
  // rechaza cualquier peticion sin token.
  let agent: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    // Mismo adaptador y mismo pipeline que `main.ts`. El harness anterior
    // montaba la app con el adaptador Express por defecto y sin filtros de
    // excepción, así que no ejercía el pipeline que se despliega.
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

    // ── Diagnóstico y caracterización de la iniciativa ────────────────
    //
    // Se insertan directamente porque el registro de iniciativa (RF-04 /
    // HU-06) no tiene endpoint. En cuanto exista, este bloque se sustituye
    // por las llamadas HTTP correspondientes.
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic
         (id, keycloak_user_id, state, irl_framework_version)
       VALUES ($1, 'usuario-e2e', 'QUESTIONNAIRE_IN_PROGRESS', 'KTH-IRL-1.0')`,
      [diagnosticId],
    );

    await dataSource.query(
      `INSERT INTO irl_catalog.sector (nombre, activo)
       VALUES ('Agroindustria', true)
       ON CONFLICT (nombre) DO NOTHING`,
    );

    await dataSource.query(
      `INSERT INTO irl_diagnostic.iniciativa
         (id_iniciativa, id_diagnostico, id_sector, nombre, descripcion_breve,
          id_etapa, tamano_equipo, vinculacion_academica)
       SELECT $1, $2, s.id_sector, 'AgroConecta',
              'Plataforma de trazabilidad y comercialización de café',
              e.id_etapa, 3, false
         FROM irl_catalog.sector s, irl_catalog.etapa_iniciativa e
        WHERE s.nombre = 'Agroindustria' AND e.codigo = 'validacion'`,
      [randomUUID(), diagnosticId],
    );

    // ── Cuestionario + perfil de madurez ──────────────────────────────
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

    const perfil = res.body as {
      dimensionResults: { dimensionCode: string; irlLevel: number }[];
    };
    const niveles = Object.fromEntries(
      perfil.dimensionResults.map((r) => [r.dimensionCode, r.irlLevel]),
    );
    expect(niveles).toEqual({
      TRL: 6,
      CRL: 4,
      BRL: 3,
      IPRL: 1,
      TmRL: 5,
      FRL: 2,
    });
  });

  it('POST /recommendation devuelve Consultoría con sus dos alternatives', async () => {
    const res = await agent
      .post(`/api/v1/diagnostics/${diagnosticId}/recommendation`)
      .expect(201);

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

    // Capa 1
    expect(trace.layer1Excluded.map((e) => e.name)).toEqual([
      'Proyectos de Grado',
    ]);

    // Capa 2 — el ranking del cálculo puro, antes de cualquier ajuste
    expect(trace.rankingBeforeExceptions.map((r) => r.name)).toEqual([
      'Consultoría',
      'Mentoría',
      'Proyectos Integradores',
      'Formación',
      'Retos en el Aula',
    ]);

    // Capa 3 — qué ajuste se activó, cuál no, y por qué
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

    // Consultoría ganó el cálculo y además fue fijada: el resultado NO se
    // debe a que un ajuste desplazara al ganador.
    expect(trace.adjustedByException).toBe(false);

    // La caracterización está completa en este caso, así que no hay
    // degradación silenciosa que anotar.
    expect(trace.incompleteCharacterization).toEqual([]);

    expect(trace.factsHash).toHaveLength(64);
  });

  it('regenerar la recomendación es idempotente y no acumula filas', async () => {
    await agent
      .post(`/api/v1/diagnostics/${diagnosticId}/recommendation`)
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
    const otro = randomUUID();
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic
         (id, keycloak_user_id, state, irl_framework_version)
       VALUES ($1, 'usuario-e2e', 'QUESTIONNAIRE_IN_PROGRESS', 'KTH-IRL-1.0')`,
      [otro],
    );

    try {
      const res = await agent
        .get(`/api/v1/diagnostics/${otro}/recommendation`)
        .expect(409);
      expect((res.body as { code: string }).code).toBe(
        'ROUTING_RECOMMENDATION_NOT_GENERATED',
      );
    } finally {
      await dataSource.query(
        `DELETE FROM irl_diagnostic.diagnostic WHERE id = $1`,
        [otro],
      );
    }
  });
});
