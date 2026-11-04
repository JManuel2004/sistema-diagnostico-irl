import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import nock from 'nock';
import { randomUUID } from 'node:crypto';
import {
  agroconectaWithProfile,
  bootWithMail,
  eventually,
  stateOf,
  type BootedApp,
} from '../../support/deep-analysis-case.js';

/**
 * E2E — the report reaches INNLAB by mail, through a real SMTP server.
 *
 * The SMTP server is the test inbox of `docker-compose.yml` (Mailpit,
 * started by `pnpm db:up`); its API is how the suite reads what arrived.
 * Each run mails a unique address, so runs never read each other's mail.
 * The settings come from the suite, never from `.env`: running the tests
 * must not send anything to a real inbox.
 *
 *   MAILPIT_SMTP_HOST / MAILPIT_SMTP_PORT   default localhost:1025
 *   MAILPIT_API                             default http://localhost:8025
 */
const SMTP_HOST = process.env.MAILPIT_SMTP_HOST ?? 'localhost';
const SMTP_PORT = Number(process.env.MAILPIT_SMTP_PORT ?? 1025);
const MAILPIT_API = process.env.MAILPIT_API ?? 'http://localhost:8025';
const TO = `innlab+${randomUUID().slice(0, 8)}@innlab.example.com`;

interface MailpitSummary {
  readonly ID: string;
  readonly Subject: string;
}
interface MailpitMessage {
  readonly Subject: string;
  readonly To: readonly { readonly Address: string }[];
  readonly Text: string;
  readonly Attachments: readonly {
    readonly PartID: string;
    readonly FileName: string;
    readonly ContentType: string;
    readonly Size: number;
  }[];
}

async function mailpit<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MAILPIT_API}/api/v1${path}`, init);
  if (!res.ok)
    throw new Error(`Mailpit answered ${String(res.status)} to ${path}`);
  return (await res.json()) as T;
}

// This suite talks to Mailpit over SMTP. The deploy sends through Resend,
// and GitHub Actions has no Mailpit, so the suite stays local.
const describeInbox = process.env.CI === 'true' ? describe.skip : describe;

describeInbox('Correo del reporte a INNLAB (e2e, buzón de pruebas real)', () => {
  let booted: BootedApp;
  let diagnosticId: string;
  let initiativeId: string;

  beforeAll(async () => {
    // Fails loud: without the inbox this suite cannot say anything.
    await mailpit('/info').catch((cause: unknown) => {
      throw new Error(
        `The test inbox is not reachable at ${MAILPIT_API}: start it with \`pnpm db:up\`.`,
        { cause },
      );
    });
    booted = await bootWithMail({ to: TO, host: SMTP_HOST, port: SMTP_PORT });
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
    const found = await mailpit<{ messages: MailpitSummary[] }>(
      `/search?query=${encodeURIComponent(`to:"${TO}"`)}`,
    ).catch(() => ({ messages: [] }));
    if (found.messages.length > 0) {
      await fetch(`${MAILPIT_API}/api/v1/messages`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ IDs: found.messages.map((m) => m.ID) }),
      });
    }
    nock.cleanAll();
    await booted?.app.close();
  });

  it('al completar el análisis profundo llega un correo con el reporte en PDF adjunto', async () => {
    await booted.agent
      .post(`/api/v1/diagnostics/${diagnosticId}/deep-analysis`)
      .expect(201);
    await eventually(async () =>
      (await stateOf(booted.dataSource, diagnosticId)) ===
      'DEEP_ANALYSIS_COMPLETE'
        ? true
        : undefined,
    );

    const summary = await eventually(async () => {
      const found = await mailpit<{ messages: MailpitSummary[] }>(
        `/search?query=${encodeURIComponent(`to:"${TO}"`)}`,
      );
      return found.messages[0];
    });
    const message = await mailpit<MailpitMessage>(`/message/${summary.ID}`);

    expect(message.Subject).toMatch(/^Reporte IRL completo: /);
    expect(message.To.map((t) => t.Address)).toEqual([TO]);
    expect(message.Attachments).toHaveLength(1);
    const [pdf] = message.Attachments;
    expect(pdf.ContentType).toBe('application/pdf');
    expect(pdf.FileName).toMatch(
      /^reporte-irl-agroconecta-\d{4}-\d{2}-\d{2}\.pdf$/,
    );

    // The attachment is a real PDF, not an empty part.
    const bytes = Buffer.from(
      await (
        await fetch(
          `${MAILPIT_API}/api/v1/message/${summary.ID}/part/${pdf.PartID}`,
        )
      ).arrayBuffer(),
    );
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(10_000);
  });
});
