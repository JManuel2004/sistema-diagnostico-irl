import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { ReportMail, ReportMailerPort } from '../../application/ports/report-mailer.port.js';

export interface SmtpSettings {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;
  readonly from: string;
}

/**
 * Sends the report through SMTP. A missing or refusing server rejects,
 * and the listener records that without failing the diagnostic.
 */
export class NodemailerReportMailer implements ReportMailerPort {
  private readonly transport: Transporter;

  constructor(private readonly smtp: SmtpSettings) {
    this.transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: smtp.user === '' ? undefined : { user: smtp.user, pass: smtp.password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  async send(mail: ReportMail): Promise<void> {
    await this.transport.sendMail({
      from: this.smtp.from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      attachments: [
        {
          filename: mail.attachment.fileName,
          content: Buffer.from(mail.attachment.content),
          contentType: mail.attachment.contentType,
        },
      ],
    });
  }
}
