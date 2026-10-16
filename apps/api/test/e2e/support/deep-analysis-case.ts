import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { authenticateAgainst } from './authenticated-app.js';
import { insertInitiativeWithProfile } from './initiative-rows.js';
import { agroconectaAnswers } from './agroconecta-case.js';

/**
 * Mail settings for a suite that must not depend on `.env`: they are put in
 * `process.env` **before** `AppModule` is imported (environment variables
 * win over the env files), which is why the module is imported here
 * dynamically.
 */
export interface MailSettings {
  readonly to: string;
  readonly host: string;
  readonly port: number;
}

export interface BootedApp {
  readonly app: NestFastifyApplication;
  readonly dataSource: DataSource;
  readonly agent: ReturnType<typeof request.agent>;
  readonly userId: string;
}

export async function bootWithMail(mail: MailSettings): Promise<BootedApp> {
  process.env.REPORT_NOTIFY_TO = mail.to;
  process.env.SMTP_HOST = mail.host;
  process.env.SMTP_PORT = String(mail.port);
  process.env.SMTP_USER = '';
  process.env.SMTP_PASS = '';
  process.env.SMTP_FROM = 'noreply@innlab.example.com';

  const [{ AppModule }, { configureApp }] = await Promise.all([
    import('../../../src/app.module.js'),
    import('../../../src/shared/kernel/infrastructure/http/configure-app.js'),
  ]);
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({ logger: false }),
  );
  configureApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const userId = randomUUID();
  const agent = request
    .agent(app.getHttpServer())
    .set('Authorization', authenticateAgainst(app, userId));
  return { app, dataSource: app.get(DataSource), agent, userId };
}

/**
 * A diagnostic of `userId` with its initiative and the AgroConecta answers
 * processed: ready to accept the deep analysis. Returns its id and the
 * initiative's, for the clean-up.
 */
export async function agroconectaWithProfile(
  booted: BootedApp,
): Promise<{ diagnosticId: string; initiativeId: string }> {
  const { dataSource, agent, userId } = booted;
  const diagnosticId = randomUUID();
  await dataSource.query(
    `INSERT INTO irl_diagnostic.diagnostic (id, cognito_user_id, state, id_framework_version)
     VALUES ($1, $2, 'WITH_INITIATIVE', (SELECT id FROM irl_catalog.framework_version WHERE code = 'KTH-IRL-1.0'))`,
    [diagnosticId, userId],
  );
  const initiativeId = await insertInitiativeWithProfile(
    dataSource,
    diagnosticId,
    userId,
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
  return { diagnosticId, initiativeId };
}

/** Waits until `check` holds, polling; fails after `timeoutMs`. */
export async function eventually<T>(
  check: () => Promise<T | undefined>,
  timeoutMs = 20_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await check();
    if (value !== undefined) return value;
    if (Date.now() > deadline)
      throw new Error(`Condition not met within ${String(timeoutMs)} ms`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

export async function stateOf(
  dataSource: DataSource,
  diagnosticId: string,
): Promise<string> {
  const [row] = await dataSource.query<{ state: string }[]>(
    `SELECT state FROM irl_diagnostic.diagnostic WHERE id = $1`,
    [diagnosticId],
  );
  return row.state;
}
