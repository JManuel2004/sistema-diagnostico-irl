import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { ResendReportMailer } from '../../../../../../src/modules/reporting/infrastructure/mail/resend-report-mailer.js';

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

describe('ResendReportMailer', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts the PDF to Resend over HTTPS', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));
    const mailer = new ResendReportMailer({
      apiKey: 're_test',
      from: 'INNLAB Diagnostico <onboarding@resend.dev>',
    });

    await mailer.send({
      to: 'pruebainnlab@gmail.com',
      subject: 'Reporte',
      text: 'Adjunto.',
      attachment: {
        fileName: 'reporte.pdf',
        contentType: 'application/pdf',
        content: PDF,
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer re_test');
    if (typeof init.body !== 'string') {
      throw new Error('Resend body must be a JSON string');
    }
    const body = JSON.parse(init.body) as {
      from: string;
      to: string[];
      attachments: { filename: string; content: string }[];
    };
    expect(body.from).toBe('INNLAB Diagnostico <onboarding@resend.dev>');
    expect(body.to).toEqual(['pruebainnlab@gmail.com']);
    expect(body.attachments[0]?.filename).toBe('reporte.pdf');
    expect(body.attachments[0]?.content).toBe(
      Buffer.from(PDF).toString('base64'),
    );
  });

  it('raises the response body when Resend rejects the message', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response('domain is not verified', { status: 403 }),
      );
    const mailer = new ResendReportMailer({
      apiKey: 're_test',
      from: 'pruebainnlab@gmail.com',
    });

    await expect(
      mailer.send({
        to: 'pruebainnlab@gmail.com',
        subject: 'Reporte',
        text: 'Adjunto.',
        attachment: {
          fileName: 'reporte.pdf',
          contentType: 'application/pdf',
          content: PDF,
        },
      }),
    ).rejects.toThrow(
      'Resend rejected the report mail (403): domain is not verified',
    );
  });
});
