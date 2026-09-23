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
  maturityProfileResponseSchema,
  roadmapResponseSchema,
} from '@innlab/contracts';
import { AppModule } from '../../../../src/app.module.js';
import { configureApp } from '../../../../src/shared/kernel/infrastructure/http/configure-app.js';
import { authenticateAgainst } from '../../support/authenticated-app.js';
import { agroconectaAnswers } from '../../support/agroconecta-case.js';

/**
 * E2E — roadmap de escalamiento para el perfil de AgroConecta.
 *
 * El roadmap es un resultado guardado: se calcula al aceptar el análisis
 * profundo y `GET /roadmap` solo lo lee. Antes de aceptar responde 409.
 *
 * Requiere la base migrada y sembrada:
 *   pnpm --filter @innlab/api db:migration:run && db:seed
 *
 * Sigue el patrón de las demás suites e2e (AppModule real + supertest
 * contra la base configurada). Crea su propio diagnóstico con un UUID
 * aleatorio y lo borra al terminar: las suites e2e corren en procesos
 * separados y comparten base, así que ninguna puede asumir que es la
 * única escribiendo.
 *
 * Las 48 respuestas (`support/agroconecta-case.ts`) producen exactamente el
 * perfil del caso mediante la tabla de conversión SA-06:
 *
 *   TRL  suma 26 → 3.250 → IRL 6      IPRL suma  9 → 1.125 → IRL 1
 *   CRL  suma 19 → 2.375 → IRL 4      TmRL suma 22 → 2.750 → IRL 5
 *   BRL  suma 15 → 1.875 → IRL 3      FRL  suma 13 → 1.625 → IRL 2
 */
describe('Roadmap de escalamiento (e2e) — AgroConecta', () => {
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

    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic
         (id, cognito_user_id, state, irl_framework_version)
       VALUES ($1, 'usuario-e2e-roadmap', 'QUESTIONNAIRE_IN_PROGRESS', 'KTH-IRL-1.0')`,
      [diagnosticId],
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

    const perfil = maturityProfileResponseSchema.parse(res.body);
    expect(
      Object.fromEntries(
        perfil.dimensionResults.map((r) => [r.dimensionCode, r.irlLevel]),
      ),
    ).toEqual({ TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 });
  });

  // `name` used to serialize the dimension code. Both names come
  // from the catalog in the database, in the real HTTP response.
  it('el perfil nombra cada dimensión con el catálogo, no con su código', async () => {
    const res = await agent
      .get(`/api/v1/diagnostics/${diagnosticId}/profile`)
      .expect(200);

    const perfil = maturityProfileResponseSchema.parse(res.body);
    const brl = perfil.dimensionResults.find((r) => r.dimensionCode === 'BRL');

    expect(brl).toMatchObject({
      name: 'Nivel de Madurez del Modelo de Negocio',
      shortName: 'Negocio',
    });
    for (const r of perfil.dimensionResults) {
      expect(r.name).not.toBe(r.dimensionCode);
    }
  });

  it('antes de aceptar el análisis profundo el roadmap no existe: 409 ROADMAP_NOT_GENERATED', async () => {
    const res = await agent
      .get(`/api/v1/diagnostics/${diagnosticId}/roadmap`)
      .expect(409);

    expect(res.body).toMatchObject({ code: 'ROADMAP_NOT_GENERATED' });
  });

  describe('tras aceptar el análisis profundo', () => {
    beforeAll(async () => {
      await agent
        .post(`/api/v1/diagnostics/${diagnosticId}/deep-analysis`)
        .expect(201);
    });

    it('GET /roadmap devuelve dos fases con el orden de dependencies esperado', async () => {
      const res = await agent
        .get(`/api/v1/diagnostics/${diagnosticId}/roadmap`)
        .expect(200);

      const roadmap = roadmapResponseSchema.parse(res.body);

      expect(roadmap.phases).toHaveLength(2);

      // Fase 1: Modelo de Negocio y Propiedad Intelectual, en paralelo.
      expect(roadmap.phases[0].order).toBe(1);
      expect(roadmap.phases[0].dimensions.map((d) => d.dimensionCode)).toEqual([
        'BRL',
        'IPRL',
      ]);

      // Fase 2: Financiamiento, que dependía de ambas.
      expect(roadmap.phases[1].order).toBe(2);
      expect(roadmap.phases[1].dimensions.map((d) => d.dimensionCode)).toEqual([
        'FRL',
      ]);
    });

    it('excluye Tecnología, Cliente y Equipo, y lo dice explícitamente', () => {
      return agent
        .get(`/api/v1/diagnostics/${diagnosticId}/roadmap`)
        .expect(200)
        .expect((res) => {
          const roadmap = roadmapResponseSchema.parse(res.body);

          expect(
            roadmap.dimensionsWithoutIntervention.map((d) => d.code).sort(),
          ).toEqual(['CRL', 'TRL', 'TmRL']);
          // Sin intervención, pero nombradas con el catálogo.
          expect(
            roadmap.dimensionsWithoutIntervention.map((d) => d.shortName).sort(),
          ).toEqual(['Cliente', 'Equipo', 'Tecnología']);

          const intervenidas = roadmap.phases.flatMap((f) =>
            f.dimensions.map((d) => d.dimensionCode),
          );
          expect(intervenidas).not.toContain('TRL');
          expect(intervenidas).not.toContain('CRL');
          expect(intervenidas).not.toContain('TmRL');
        });
    });

    it('lleva las tres dimensions intervenidas hasta el nivel 4', async () => {
      const res = await agent
        .get(`/api/v1/diagnostics/${diagnosticId}/roadmap`)
        .expect(200);
      const roadmap = roadmapResponseSchema.parse(res.body);

      const targets = Object.fromEntries(
        roadmap.phases.flatMap((f) =>
          f.dimensions.map((d) => [
            d.dimensionCode,
            { de: d.currentLevel, a: d.targetLevel },
          ]),
        ),
      );

      expect(targets).toEqual({
        BRL: { de: 3, a: 4 },
        IPRL: { de: 1, a: 4 },
        FRL: { de: 2, a: 4 },
      });
    });

    it('expone qué desbloquea cada dimensión, para que el orden sea refutable', async () => {
      const res = await agent
        .get(`/api/v1/diagnostics/${diagnosticId}/roadmap`)
        .expect(200);
      const roadmap = roadmapResponseSchema.parse(res.body);

      const habilita = Object.fromEntries(
        roadmap.phases.flatMap((f) =>
          f.dimensions.map((d) => [d.dimensionCode, d.enables.map((e) => e.code)]),
        ),
      );

      expect(habilita).toEqual({ BRL: ['FRL'], IPRL: ['FRL'], FRL: [] });
    });

    it('nombra cada dimensión del roadmap con el catálogo', async () => {
      const res = await agent
        .get(`/api/v1/diagnostics/${diagnosticId}/roadmap`)
        .expect(200);
      const roadmap = roadmapResponseSchema.parse(res.body);

      const brl = roadmap.phases[0].dimensions[0];
      expect(brl).toMatchObject({
        dimensionCode: 'BRL',
        name: 'Nivel de Madurez del Modelo de Negocio',
        shortName: 'Negocio',
      });
      expect(brl.enables).toEqual([
        {
          code: 'FRL',
          name: 'Nivel de Madurez de la Financiación',
          shortName: 'Financiación',
        },
      ]);
    });

    // The response says why each dimension is in the plan and
    // what sets its target, and it is the roadmap saved at acceptance.
    it('explica por qué cada dimensión está en el plan y qué fija su meta', async () => {
      const res = await agent
        .get(`/api/v1/diagnostics/${diagnosticId}/roadmap`)
        .expect(200);
      const roadmap = roadmapResponseSchema.parse(res.body);

      const porDimension = Object.fromEntries(
        roadmap.phases.flatMap((f) =>
          f.dimensions.map((d) => [
            d.dimensionCode,
            {
              motivo: d.inclusionReason,
              minimo: d.expectedMinimum,
              fijadaPor: d.targetDrivenBy?.code ?? null,
            },
          ]),
        ),
      );

      // Las tres están por debajo de su mínimo (4) y la meta es ese mínimo:
      // ninguna exigencia de otra dimensión la eleva.
      const propia = {
        motivo: 'BELOW_EXPECTED_MINIMUM',
        minimo: 4,
        fijadaPor: null,
      };
      expect(porDimension).toEqual({ BRL: propia, IPRL: propia, FRL: propia });
    });

    it('es un resultado guardado: leerlo dos veces da la misma fecha', async () => {
      const a = await agent
        .get(`/api/v1/diagnostics/${diagnosticId}/roadmap`)
        .expect(200);
      const b = await agent
        .get(`/api/v1/diagnostics/${diagnosticId}/roadmap`)
        .expect(200);

      expect(roadmapResponseSchema.parse(b.body).generatedAt).toBe(
        roadmapResponseSchema.parse(a.body).generatedAt,
      );
    });
  });

  it('un diagnóstico sin perfil calculado devuelve 409, no 404', async () => {
    const otro = randomUUID();
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic
         (id, cognito_user_id, state, irl_framework_version)
       VALUES ($1, 'usuario-e2e-roadmap', 'QUESTIONNAIRE_IN_PROGRESS', 'KTH-IRL-1.0')`,
      [otro],
    );

    try {
      await agent.get(`/api/v1/diagnostics/${otro}/roadmap`).expect(409);
    } finally {
      await dataSource.query(
        `DELETE FROM irl_diagnostic.diagnostic WHERE id = $1`,
        [otro],
      );
    }
  });
});
