import type {
  ReportMail,
  ReportMailerPort,
} from '../../application/ports/report-mailer.port.js';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

export interface ResendSettings {
  readonly apiKey: string;
  readonly from: string;
}

/**
 * Sends the report through Resend's HTTPS API. A free Render web service
 * blocks SMTP ports 25, 465 and 587, and this call uses 443.
 *
 * Without a verified domain, Resend only accepts `onboarding@resend.dev`
 * as the sender and only delivers to the address of the Resend account.
 */
export class ResendReportMailer implements ReportMailerPort {
  constructor(private readonly settings: ResendSettings) {}

  async send(mail: ReportMail): Promise<void> {
    const response = await fetch(RESEND_EMAILS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.settings.from,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        attachments: [
          {
            filename: mail.attachment.fileName,
            content: Buffer.from(mail.attachment.content).toString('base64'),
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Resend rejected the report mail (${String(response.status)}): ${body}`,
      );
    }
  }
}
