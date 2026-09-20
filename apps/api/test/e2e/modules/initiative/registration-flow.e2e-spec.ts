import { beforeAll, afterAll, describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import request from 'supertest';
import nock from 'nock';
import { randomUUID } from 'node:crypto';
import {
  diagnosticSchema,
  initiativeSchema,
  initiativeStageSchema,
  maturityProfileResponseSchema,
  sectorSchema,
} from '@innlab/contracts';
import { AppModule } from '../../../../src/app.module.js';
import { configureApp } from '../../../../src/shared/kernel/infrastructure/http/configure-app.js';
import { authenticateAgainst } from '../../support/authenticated-app.js';
import {
  AGROCONECTA_LEVELS,
  agroconectaAnswers,
  agroconectaInitiative,
} from '../../support/agroconecta-case.js';

/**
 * E2E — from starting a diagnostic to its profile, the way the web app walks
 * it: start → privacy consent → initiative profile → questionnaire with the
 * justification of each answer → profile → deep analysis.
 *
 * `POST /diagnostics` resumes the user's unfinished diagnostic, and suites run
 * in parallel on one database, so this one has a user of its own and clears
 * that user's diagnostics before each start.
 *
 * Requires the migrated and seeded database (the seed carries the sector of
 * the case and the three initiative stages).
 */
describe('Iniciar → consentimiento → iniciativa → cuestionario → perfil (e2e)', () => {
  const userId = randomUUID();
  let app: NestFastifyApplication;
  let dataSource: DataSource;
  let agent: ReturnType<typeof request.agent>;
  let sectorId: string;
  let stageId: string;
  const created: string[] = [];

  /** A fresh diagnostic of this suite's user, in `STARTED`. */
  async function start(): Promise<string> {
    await dataSource.query(`DELETE FROM irl_diagnostic.diagnostic WHERE cognito_user_id = $1`, [
      userId,
    ]);
    const res = await agent.post('/api/v1/diagnostics').expect(201);
    return diagnosticSchema.parse(res.body).id;
  }

  async function consent(id: string): Promise<void> {
    await agent.post(`/api/v1/diagnostics/${id}/consent`).send({ version: 'v1' }).expect(201);
  }

  /** A diagnostic with the consent recorded, ready for the initiative. */
  async function startWithConsent(): Promise<string> {
    const id = await start();
    await consent(id);
    return id;
  }

  async function stateOf(id: string): Promise<string> {
    const [row] = await dataSource.query<{ state: string }[]>(
      `SELECT state FROM irl_diagnostic.diagnostic WHERE id = $1`,
      [id],
    );
    return row.state;
  }

  async function statements() {
    return dataSource.query<{ id_statement: string; code: string; sequence: number }[]>(
      `SELECT a.id_statement, d.code, a.sequence
         FROM irl_catalog.statement a
         JOIN irl_catalog.dimension d ON d.id_dimension = a.id_dimension
        ORDER BY d.sequence, a.sequence`,
    );
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ logger: false }),
    );
    configureApp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    agent = request
      .agent(app.getHttpServer())
      .set('Authorization', authenticateAgainst(app, userId));
    dataSource = app.get(DataSource);

    const sectors = await agent.get('/api/v1/initiative-catalog/sectors').expect(200);
    sectorId = (sectors.body as { id: string; name: string }[]).find(
      (s) => s.name === 'Agroindustria / AgriTech',
    )!.id;
    const stages = await agent.get('/api/v1/initiative-catalog/stages').expect(200);
    stageId = (stages.body as { id: string; code: string }[]).find(
      (s) => s.code === 'validacion',
    )!.id;
  }, 60_000);

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(`DELETE FROM irl_diagnostic.diagnostic WHERE cognito_user_id = $1`, [
        userId,
      ]);
      if (created.length > 0) {
        await dataSource.query(
          `DELETE FROM irl_diagnostic.diagnostic WHERE id = ANY($1::uuid[])`,
          [created],
        );
      }
    }
    nock.cleanAll();
    await app?.close();
  });

  describe('catálogos de la iniciativa', () => {
    it('sirve el sector del caso y las tres etapas en orden', async () => {
      const sectors = await agent.get('/api/v1/initiative-catalog/sectors').expect(200);
      const stages = await agent.get('/api/v1/initiative-catalog/stages').expect(200);

      const parsedSectors = (sectors.body as unknown[]).map((s) => sectorSchema.parse(s));
      const parsedStages = (stages.body as unknown[]).map((s) => initiativeStageSchema.parse(s));
      expect(parsedSectors.map((s) => s.name)).toContain('Agroindustria / AgriTech');
      expect(parsedStages.map((s) => s.code)).toEqual(['idea', 'validacion', 'crecimiento']);
    });
  });

  describe('consentimiento previo a la iniciativa (RF-03 / RNF-06)', () => {
    it('no guarda la iniciativa de un diagnóstico sin consentimiento y responde 409', async () => {
      const id = await start();

      await agent
        .post(`/api/v1/diagnostics/${id}/initiative`)
        .send(agroconectaInitiative({ sectorId, stageId }))
        .expect(409);

      await agent.get(`/api/v1/diagnostics/${id}/initiative`).expect(404);
      expect(await stateOf(id)).toBe('STARTED');
    });

    it('el consentimiento mueve el diagnóstico a WITH_CONSENT y lo deja listo para la iniciativa', async () => {
      const id = await start();

      await consent(id);

      expect(await stateOf(id)).toBe('WITH_CONSENT');
      await agent
        .post(`/api/v1/diagnostics/${id}/initiative`)
        .send(agroconectaInitiative({ sectorId, stageId }))
        .expect(201);
    });
  });

  describe('registro de la iniciativa', () => {
    it('guarda el perfil completo y lo devuelve con el sector y la etapa nombrados', async () => {
      const id = await startWithConsent();

      const res = await agent
        .post(`/api/v1/diagnostics/${id}/initiative`)
        .send(agroconectaInitiative({ sectorId, stageId }))
        .expect(201);

      const initiative = initiativeSchema.parse(res.body);
      expect(initiative.sector.name).toBe('Agroindustria / AgriTech');
      expect(initiative.stage).toMatchObject({ code: 'validacion', name: 'Validación' });
      expect(initiative.teamSize).toBe(3);
      expect(initiative.currentFunding).toContain('COP 25M');
    });

    it('lo que se guardó es lo que se lee de vuelta', async () => {
      const id = await startWithConsent();
      await agent
        .post(`/api/v1/diagnostics/${id}/initiative`)
        .send(agroconectaInitiative({ sectorId, stageId }))
        .expect(201);

      const read = await agent.get(`/api/v1/diagnostics/${id}/initiative`).expect(200);

      const initiative = initiativeSchema.parse(read.body);
      expect(initiative.name).toContain('AgroConecta');
      expect(initiative.targetMarket).toContain('Cauca y Valle del Cauca');
    });

    it('avanza el diagnóstico de WITH_CONSENT a WITH_INITIATIVE', async () => {
      const id = await startWithConsent();
      expect(await stateOf(id)).toBe('WITH_CONSENT');

      await agent
        .post(`/api/v1/diagnostics/${id}/initiative`)
        .send(agroconectaInitiative({ sectorId, stageId }))
        .expect(201);

      expect(await stateOf(id)).toBe('WITH_INITIATIVE');
    });

    it('volver a registrarla la actualiza y no retrocede el diagnóstico', async () => {
      const id = await startWithConsent();
      const body = agroconectaInitiative({ sectorId, stageId });
      await agent.post(`/api/v1/diagnostics/${id}/initiative`).send(body).expect(201);

      await agent
        .post(`/api/v1/diagnostics/${id}/initiative`)
        .send({ ...body, currentFunding: 'Otro financiamiento' })
        .expect(201);

      const read = await agent.get(`/api/v1/diagnostics/${id}/initiative`).expect(200);
      expect(initiativeSchema.parse(read.body).currentFunding).toBe('Otro financiamiento');
      expect(await stateOf(id)).toBe('WITH_INITIATIVE');
    });

    it.each(['productType', 'declaredStage', 'teamDescription', 'targetMarket', 'currentFunding'])(
      'rechaza con 422 un perfil sin %s y no lo guarda',
      async (field) => {
        const id = await startWithConsent();

        await agent
          .post(`/api/v1/diagnostics/${id}/initiative`)
          .send({ ...agroconectaInitiative({ sectorId, stageId }), [field]: '  ' })
          .expect(422);

        await agent.get(`/api/v1/diagnostics/${id}/initiative`).expect(404);
        expect(await stateOf(id)).toBe('WITH_CONSENT');
      },
    );

    it('rechaza con 404 una etapa que no existe', async () => {
      const id = await startWithConsent();

      await agent
        .post(`/api/v1/diagnostics/${id}/initiative`)
        .send(agroconectaInitiative({ sectorId, stageId: '999999' }))
        .expect(404);
    });
  });

  describe('cuestionario con justificaciones', () => {
    async function withInitiative(): Promise<string> {
      const id = await startWithConsent();
      await agent
        .post(`/api/v1/diagnostics/${id}/initiative`)
        .send(agroconectaInitiative({ sectorId, stageId }))
        .expect(201);
      return id;
    }

    it('procesa las 48 respuestas del caso y da el perfil esperado', async () => {
      const id = await withInitiative();

      const res = await agent
        .post(`/api/v1/diagnostics/${id}/finalize-initial`)
        .send({ answers: agroconectaAnswers(await statements()) })
        .expect(201);

      const profile = maturityProfileResponseSchema.parse(res.body);
      expect(
        Object.fromEntries(profile.dimensionResults.map((r) => [r.dimensionCode, r.irlLevel])),
      ).toEqual(AGROCONECTA_LEVELS);
      expect(await stateOf(id)).toBe('PROFILE_GENERATED');
    });

    it('guarda la justificación junto a cada respuesta', async () => {
      const id = await withInitiative();
      const answers = agroconectaAnswers(await statements());
      await agent.post(`/api/v1/diagnostics/${id}/finalize-initial`).send({ answers }).expect(201);

      const rows = await dataSource.query<{ id_statement: string; justification: string }[]>(
        `SELECT id_statement::text AS id_statement, justification
           FROM irl_diagnostic.answer WHERE id_diagnostic = $1`,
        [id],
      );

      expect(rows).toHaveLength(48);
      const byStatement = new Map(rows.map((r) => [r.id_statement, r.justification]));
      for (const a of answers) {
        expect(byStatement.get(a.statementId)).toBe(a.justification);
      }
    });

    it('rechaza con 422 un envío en que falta una justificación, sin guardar nada', async () => {
      const id = await withInitiative();
      const answers = agroconectaAnswers(await statements());
      answers[10] = { ...answers[10], justification: '   ' };

      await agent.post(`/api/v1/diagnostics/${id}/finalize-initial`).send({ answers }).expect(422);

      const [{ count }] = await dataSource.query<{ count: string }[]>(
        `SELECT count(*) FROM irl_diagnostic.answer WHERE id_diagnostic = $1`,
        [id],
      );
      expect(Number(count)).toBe(0);
      expect(await stateOf(id)).toBe('WITH_INITIATIVE');
    });

    it('rechaza con 422 un envío sin el campo justification', async () => {
      const id = await withInitiative();
      const answers = agroconectaAnswers(await statements()).map(({ statementId, value }) => ({
        statementId,
        value,
      }));

      await agent.post(`/api/v1/diagnostics/${id}/finalize-initial`).send({ answers }).expect(422);
    });

    it('no deja procesar el cuestionario antes de registrar la iniciativa', async () => {
      const id = await start();

      await agent
        .post(`/api/v1/diagnostics/${id}/finalize-initial`)
        .send({ answers: agroconectaAnswers(await statements()) })
        .expect(409);
    });
  });

  describe('resultados: qué se muestra depende del análisis profundo', () => {
    async function withProfile(): Promise<string> {
      const id = await startWithConsent();
      await agent
        .post(`/api/v1/diagnostics/${id}/initiative`)
        .send(agroconectaInitiative({ sectorId, stageId }))
        .expect(201);
      await agent
        .post(`/api/v1/diagnostics/${id}/finalize-initial`)
        .send({ answers: agroconectaAnswers(await statements()) })
        .expect(201);
      return id;
    }

    it('el perfil trae el estado crítico calculado por el backend: solo BRL', async () => {
      const id = await withProfile();

      const res = await agent.get(`/api/v1/diagnostics/${id}/profile`).expect(200);

      // BRL is at level 3 (a gap in a susceptible dimension); IPRL (1) and FRL
      // (2) are gaps too, but they cannot be in critical state.
      const profile = maturityProfileResponseSchema.parse(res.body);
      expect(profile.gaps.dimensions).toEqual(expect.arrayContaining(['BRL', 'IPRL', 'FRL']));
      expect(profile.criticalState.dimensions).toEqual(['BRL']);
    });

    it('el diagnóstico dice que el análisis profundo no fue aceptado, hasta que se acepta', async () => {
      const id = await withProfile();

      const before = diagnosticSchema.parse(
        (await agent.get(`/api/v1/diagnostics/${id}`).expect(200)).body,
      );
      expect(before.completed).toBe(true);
      await agent.post(`/api/v1/diagnostics/${id}/deep-analysis`).expect(201);
      const after = diagnosticSchema.parse(
        (await agent.get(`/api/v1/diagnostics/${id}`).expect(200)).body,
      );

      expect(before.deepAnalysisAccepted).toBe(false);
      expect(before.state).toBe('PROFILE_GENERATED');
      expect(after.deepAnalysisAccepted).toBe(true);
    });

    it('un diagnóstico ajeno se responde como inexistente', async () => {
      const otro = randomUUID();
      await dataSource.query(
        `INSERT INTO irl_diagnostic.diagnostic (id, cognito_user_id, state, irl_framework_version)
         VALUES ($1, 'otro-usuario', 'PROFILE_GENERATED', 'KTH-IRL-1.0')`,
        [otro],
      );
      created.push(otro);

      await agent.get(`/api/v1/diagnostics/${otro}`).expect(404);
    });
  });
});
