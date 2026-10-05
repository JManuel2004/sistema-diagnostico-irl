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
  diagnosticReportSchema,
  diagnosticSchema,
  IRL_ATTRIBUTION,
  recommendationResponseSchema,
  roadmapResponseSchema,
} from '@innlab/contracts';
import { AppModule } from '../../../../src/app.module.js';
import { configureApp } from '../../../../src/shared/kernel/infrastructure/http/configure-app.js';
import {
  authenticateAgainst,
  E2E_USER,
} from '../../support/authenticated-app.js';
import { insertInitiativeWithProfile } from '../../support/initiative-rows.js';
import { agroconectaAnswers } from '../../support/agroconecta-case.js';

/**
 * E2E — the full report of the AgroConecta diagnostic (RF-16 / HU-23).
 *
 * The report gathers the saved results of a diagnostic and exists only once
 * the deep analysis is complete: before that it answers 409. It must say
 * exactly what the separate endpoints say, since it recalculates nothing.
 *
 * Needs the migrated and seeded database. Creates its own diagnostic and
 * initiative with random UUIDs and deletes them when done.
 */
describe('Reporte completo (e2e) — AgroConecta', () => {
  let app: NestFastifyApplication;
  let dataSource: DataSource;
  let agent: ReturnType<typeof request.agent>;
  const diagnosticId = randomUUID();
  let initiativeId: string;

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
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic
         (id, cognito_user_id, state, id_framework_version)
       VALUES ($1, $2, 'QUESTIONNAIRE_IN_PROGRESS', (SELECT id FROM irl_catalog.framework_version WHERE code = 'KTH-IRL-1.0'))`,
      [diagnosticId, E2E_USER.sub],
    );
    initiativeId = await insertInitiativeWithProfile(
      dataSource,
      diagnosticId,
      E2E_USER.sub,
    );

    const statements = await dataSource.query<
      { id_statement: string; code: string; sequence: number }[]
    >(
      `SELECT a.id_statement, d.code, a.sequence
         FROM irl_catalog.statement a
         JOIN irl_catalog.dimension d ON d.id_dimension = a.id_dimension
        ORDER BY d.sequence, a.sequence`,
    );
    await agent
      .post(`/api/v1/diagnostics/${diagnosticId}/finalize-initial`)
      .send({ answers: agroconectaAnswers(statements) })
      .expect(201);
  }, 60_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        `DELETE FROM irl_diagnostic.diagnostic WHERE id = $1`,
        [diagnosticId],
      );
      await dataSource.query(
        `DELETE FROM irl_diagnostic.initiative WHERE id = $1`,
        [initiativeId],
      );
    }
    nock.cleanAll();
    await app?.close();
  });

  it('antes del análisis profundo el reporte no existe: 409 REPORT_NOT_AVAILABLE', async () => {
    const res = await agent
      .get(`/api/v1/diagnostics/${diagnosticId}/report`)
      .expect(409);

    expect(res.body).toMatchObject({ code: 'REPORT_NOT_AVAILABLE' });
    const diagnostic = diagnosticSchema.parse(
      (await agent.get(`/api/v1/diagnostics/${diagnosticId}`).expect(200)).body,
    );
    expect(diagnostic.deepAnalysisCompleted).toBe(false);
  });

  it('antes del análisis profundo tampoco se descarga: 409 REPORT_NOT_AVAILABLE', async () => {
    const res = await agent
      .get(`/api/v1/diagnostics/${diagnosticId}/report/pdf`)
      .expect(409);

    expect(res.body).toMatchObject({ code: 'REPORT_NOT_AVAILABLE' });
  });

  describe('con el análisis profundo completo', () => {
    beforeAll(async () => {
      await agent
        .post(`/api/v1/diagnostics/${diagnosticId}/deep-analysis`)
        .expect(201);
    });

    it('el diagnóstico dice que su análisis profundo está completo', async () => {
      const diagnostic = diagnosticSchema.parse(
        (await agent.get(`/api/v1/diagnostics/${diagnosticId}`).expect(200))
          .body,
      );
      expect(diagnostic.deepAnalysisCompleted).toBe(true);
    });

    it('reúne la iniciativa, el perfil, la recomendación, el roadmap y la atribución', async () => {
      const report = diagnosticReportSchema.parse(
        (
          await agent
            .get(`/api/v1/diagnostics/${diagnosticId}/report`)
            .expect(200)
        ).body,
      );

      expect(report.diagnosticId).toBe(diagnosticId);
      expect(report.initiative.name).toBe('AgroConecta');
      expect(
        Object.fromEntries(
          report.profile.dimensionResults.map((r) => [
            r.dimensionCode,
            r.irlLevel,
          ]),
        ),
      ).toEqual({ TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 });
      expect(report.profile.criticalState.dimensions).toEqual(['BRL']);
      expect(report.profile.imbalances).toHaveLength(6);
      expect(report.attribution).toEqual(IRL_ATTRIBUTION);
    });

    it('lleva las 48 respuestas, por dimensión y en el orden del marco', async () => {
      const report = diagnosticReportSchema.parse(
        (
          await agent
            .get(`/api/v1/diagnostics/${diagnosticId}/report`)
            .expect(200)
        ).body,
      );

      expect(report.answers.map((d) => d.dimensionCode)).toEqual([
        'TRL',
        'CRL',
        'BRL',
        'IPRL',
        'TmRL',
        'FRL',
      ]);
      expect(report.answers.every((d) => d.answers.length === 8)).toBe(true);
      // AgroConecta's TRL answers add up to 26 (see `agroconecta-case.ts`).
      const trl = report.answers[0]?.answers ?? [];
      expect(trl.reduce((sum, a) => sum + a.value, 0)).toBe(26);
    });

    it('dice lo mismo que los endpoints de la recomendación y del roadmap', async () => {
      const [report, recommendation, roadmap] = await Promise.all([
        agent.get(`/api/v1/diagnostics/${diagnosticId}/report`).expect(200),
        agent
          .get(`/api/v1/diagnostics/${diagnosticId}/recommendation`)
          .expect(200),
        agent.get(`/api/v1/diagnostics/${diagnosticId}/roadmap`).expect(200),
      ]);

      const parsed = diagnosticReportSchema.parse(report.body);
      expect(parsed.recommendation).toEqual(
        recommendationResponseSchema.parse(recommendation.body),
      );
      expect(parsed.roadmap).toEqual(roadmapResponseSchema.parse(roadmap.body));
    });

    it('descarga el reporte como un PDF adjunto, con el nombre de la iniciativa', async () => {
      const res = await agent
        .get(`/api/v1/diagnostics/${diagnosticId}/report/pdf`)
        .buffer(true)
        .parse((response, callback) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer) => chunks.push(chunk));
          response.on('end', () => {
            callback(null, Buffer.concat(chunks));
          });
        })
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toMatch(
        /^attachment; filename="reporte-irl-agroconecta-\d{4}-\d{2}-\d{2}\.pdf"$/,
      );
      const body = res.body as Buffer;
      expect(body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    });
  });

  it("answers another user's diagnostic as missing (404), not revealing it exists", async () => {
    const other = randomUUID();
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic
         (id, cognito_user_id, state, id_framework_version)
       VALUES ($1, 'another-user', 'DEEP_ANALYSIS_COMPLETE', (SELECT id FROM irl_catalog.framework_version WHERE code = 'KTH-IRL-1.0'))`,
      [other],
    );

    try {
      const res = await agent
        .get(`/api/v1/diagnostics/${other}/report`)
        .expect(404);
      expect((res.body as { code: string }).code).toBe('NOT_FOUND');
    } finally {
      await dataSource.query(
        `DELETE FROM irl_diagnostic.diagnostic WHERE id = $1`,
        [other],
      );
    }
  });
});
