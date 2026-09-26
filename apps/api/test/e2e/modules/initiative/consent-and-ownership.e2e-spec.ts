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
import { consentTermsSchema, initiativeSummarySchema } from '@innlab/contracts';
import { AppModule } from '../../../../src/app.module.js';
import { configureApp } from '../../../../src/shared/kernel/infrastructure/http/configure-app.js';
import { authenticateAgainst } from '../../support/authenticated-app.js';
import { agroconectaInitiative } from '../../support/agroconecta-case.js';

/**
 * E2E — initiatives, their consent (RF-03) and the initiative profile of a
 * diagnostic (RF-04) against the real `AppModule`.
 *
 * Covers what the unit tests cannot: the consent history and its keys in
 * the database, that registering the profile moves the diagnostic's state
 * through `InitiativeRegisteredEvent`, and that the ownership checks reject
 * foreign or missing diagnostics and initiatives before writing anything.
 *
 * Uses a user of its own: other suites create initiatives for the default
 * e2e user in parallel. Needs the migrated and seeded database; creates its
 * own data with random identifiers and deletes it when done.
 */
describe('Initiatives and consent (e2e)', () => {
  const USER = `e2e-consent-${randomUUID()}`;
  const OTHER = `e2e-consent-other-${randomUUID()}`;

  let app: NestFastifyApplication;
  let dataSource: DataSource;
  let agent: ReturnType<typeof request.agent>;
  let sectorId: string;
  let stageId: string;

  const own = randomUUID();
  const frozen = randomUUID();
  const foreign = randomUUID();
  const missing = randomUUID();
  const foreignInitiative = randomUUID();

  async function createDiagnostic(id: string, userId: string, state = 'STARTED'): Promise<void> {
    await dataSource.query(
      `INSERT INTO irl_diagnostic.diagnostic (id, cognito_user_id, state, id_framework_version)
       VALUES ($1, $2, $3, (SELECT id FROM irl_catalog.framework_version WHERE code = 'KTH-IRL-1.0'))`,
      [id, userId, state],
    );
  }

  async function stateOf(id: string): Promise<string> {
    const [row] = await dataSource.query<{ state: string }[]>(
      `SELECT state FROM irl_diagnostic.diagnostic WHERE id = $1`,
      [id],
    );
    return row.state;
  }

  async function profilesOf(diagnosticId: string): Promise<number> {
    const [row] = await dataSource.query<{ n: string }[]>(
      `SELECT COUNT(*)::text AS n FROM irl_diagnostic.initiative_profile WHERE id_diagnostic = $1`,
      [diagnosticId],
    );
    return Number(row.n);
  }

  async function createInitiative(): Promise<string> {
    const res = await agent.post('/api/v1/initiatives').send({ version: 'v1' }).expect(201);
    return initiativeSummarySchema.parse(res.body).id;
  }

  function profileBody(initiativeId: string) {
    return { initiativeId, ...agroconectaInitiative({ sectorId, stageId }) };
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

    agent = request.agent(app.getHttpServer()).set('Authorization', authenticateAgainst(app, USER));

    dataSource = app.get(DataSource);
    await createDiagnostic(own, USER);
    await createDiagnostic(frozen, USER, 'DEEP_ANALYSIS_IN_PROGRESS');
    await createDiagnostic(foreign, OTHER);
    await dataSource.query(
      `INSERT INTO irl_diagnostic.initiative (id, cognito_user_id) VALUES ($1, $2)`,
      [foreignInitiative, OTHER],
    );

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
      await dataSource.query(`DELETE FROM irl_diagnostic.diagnostic WHERE id = ANY($1)`, [
        [own, frozen, foreign],
      ]);
      await dataSource.query(
        `DELETE FROM irl_diagnostic.initiative WHERE cognito_user_id = ANY($1)`,
        [[USER, OTHER]],
      );
    }
    nock.cleanAll();
    await app?.close();
  });

  describe('consent text', () => {
    it('serves the current text, the one to accept', async () => {
      const res = await agent.get('/api/v1/consent-terms/current').expect(200);

      const terms = consentTermsSchema.parse(res.body);
      expect(terms.version).toBe('v1');
      expect(terms.sections.length).toBeGreaterThan(0);
    });
  });

  describe('initiatives', () => {
    it('creates an initiative with its consent and lists it for its owner only', async () => {
      const id = await createInitiative();

      const res = await agent.get('/api/v1/initiatives').expect(200);
      const listed = initiativeSummarySchema.array().parse(res.body);

      expect(listed.map((i) => i.id)).toContain(id);
      expect(listed.map((i) => i.id)).not.toContain(foreignInitiative);
      const created = listed.find((i) => i.id === id);
      expect(created?.consentCurrent).toBe(true);
      expect(created?.consent?.version).toBe('v1');
    });

    it('refuses to create an initiative with an outdated version (409) or a malformed one (422)', async () => {
      await agent.post('/api/v1/initiatives').send({ version: 'v0' }).expect(409);
      await agent.post('/api/v1/initiatives').send({ version: 'vieja' }).expect(422);
    });

    it('accepting the consent again adds to the history instead of replacing it', async () => {
      const id = await createInitiative();

      await agent.post(`/api/v1/initiatives/${id}/consent`).send({ version: 'v1' }).expect(201);

      const [{ n }] = await dataSource.query<{ n: string }[]>(
        `SELECT COUNT(*)::text AS n FROM irl_diagnostic.consent WHERE id_initiative = $1`,
        [id],
      );
      expect(Number(n)).toBe(2);
    });

    it("answers 404 for a missing initiative and 403 for someone else's", async () => {
      await agent
        .post(`/api/v1/initiatives/${randomUUID()}/consent`)
        .send({ version: 'v1' })
        .expect(404);
      await agent
        .post(`/api/v1/initiatives/${foreignInitiative}/consent`)
        .send({ version: 'v1' })
        .expect(403);
    });
  });

  describe("profile of a diagnostic's initiative", () => {
    it('registering it moves the diagnostic from STARTED to WITH_INITIATIVE', async () => {
      const initiativeId = await createInitiative();
      expect(await stateOf(own)).toBe('STARTED');

      const res = await agent
        .post(`/api/v1/diagnostics/${own}/initiative`)
        .send(profileBody(initiativeId))
        .expect(201);

      expect(res.body).toMatchObject({ initiativeId, diagnosticId: own });
      expect(await stateOf(own)).toBe('WITH_INITIATIVE');
      await agent.get(`/api/v1/diagnostics/${own}/initiative`).expect(200);
    });

    it("refuses someone else's diagnostic (403) and a missing one (404), writing nothing", async () => {
      const initiativeId = await createInitiative();

      await agent
        .post(`/api/v1/diagnostics/${foreign}/initiative`)
        .send(profileBody(initiativeId))
        .expect(403);
      await agent
        .post(`/api/v1/diagnostics/${missing}/initiative`)
        .send(profileBody(initiativeId))
        .expect(404);

      expect(await profilesOf(foreign)).toBe(0);
    });

    it("refuses someone else's initiative (403)", async () => {
      await agent
        .post(`/api/v1/diagnostics/${own}/initiative`)
        .send(profileBody(foreignInitiative))
        .expect(403);
    });

    it('is frozen once the deep analysis is accepted (409)', async () => {
      const initiativeId = await createInitiative();

      await agent
        .post(`/api/v1/diagnostics/${frozen}/initiative`)
        .send(profileBody(initiativeId))
        .expect(409);
      expect(await profilesOf(frozen)).toBe(0);
    });

    it("refuses to read someone else's initiative profile with 403", async () => {
      await agent.get(`/api/v1/diagnostics/${foreign}/initiative`).expect(403);
    });
  });
});
