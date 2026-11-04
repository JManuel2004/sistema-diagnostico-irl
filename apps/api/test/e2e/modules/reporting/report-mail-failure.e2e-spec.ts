import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { createServer } from 'node:net';
import nock from 'nock';
import {
  agroconectaWithProfile,
  bootWithMail,
  eventually,
  stateOf,
  type BootedApp,
} from '../../support/deep-analysis-case.js';

/**
 * E2E — a mail failure never interrupts the user's flow (Plan de pruebas,
 * RF-17).
 *
 * The SMTP host is a port nothing listens on, so the mail fails for real
 * (connection refused). The leader still gets the deep analysis complete,
 * the recommendation, the route and the report, and its PDF downloads.
 */
async function closedPort(): Promise<number> {
  // A port the OS just gave and then freed: nothing listens on it.
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port =
        typeof address === 'object' && address !== null ? address.port : 1;
      server.close(() => resolve(port));
    });
  });
}

describe('Falla del correo del reporte (e2e)', () => {
  let booted: BootedApp;
  let diagnosticId: string;
  let initiativeId: string;

  beforeAll(async () => {
    booted = await bootWithMail({
      to: 'innlab@innlab.example.com',
      host: '127.0.0.1',
      port: await closedPort(),
    });
    ({ diagnosticId, initiativeId } = await agroconectaWithProfile(booted));
  }, 60_000);

  afterAll(async () => {
    if (booted?.dataSource.isInitialized) {
      await booted.dataSource.query(
        `DELETE FROM irl_diagnostic.diagnostic WHERE id = $1`,
        [diagnosticId],
      );
      await booted.dataSource.query(
        `DELETE FROM irl_diagnostic.initiative WHERE id = $1`,
        [initiativeId],
      );
    }
    nock.cleanAll();
    await booted?.app.close();
  });

  it('con el servidor de correo caído, el líder igual obtiene su análisis completo y su reporte', async () => {
    await booted.agent
      .post(`/api/v1/diagnostics/${diagnosticId}/deep-analysis`)
      .expect(201);

    await eventually(async () =>
      (await stateOf(booted.dataSource, diagnosticId)) ===
      'DEEP_ANALYSIS_COMPLETE'
        ? true
        : undefined,
    );
    // Give the failed send time to happen: nothing may break after it either.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const diagnostic = await booted.agent
      .get(`/api/v1/diagnostics/${diagnosticId}`)
      .expect(200);
    expect(
      (diagnostic.body as { deepAnalysisCompleted: boolean })
        .deepAnalysisCompleted,
    ).toBe(true);
    await booted.agent
      .get(`/api/v1/diagnostics/${diagnosticId}/recommendation`)
      .expect(200);
    await booted.agent
      .get(`/api/v1/diagnostics/${diagnosticId}/roadmap`)
      .expect(200);
    await booted.agent
      .get(`/api/v1/diagnostics/${diagnosticId}/report`)
      .expect(200);
    const pdf = await booted.agent
      .get(`/api/v1/diagnostics/${diagnosticId}/report/pdf`)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect((pdf.body as Buffer).subarray(0, 5).toString('latin1')).toBe(
      '%PDF-',
    );
  });
});
