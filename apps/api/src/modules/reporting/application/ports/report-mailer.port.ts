export const REPORT_MAILER = Symbol('REPORT_MAILER');

/** The message INNLAB receives when a deep analysis finishes. */
export interface ReportMail {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly attachment: {
    readonly fileName: string;
    readonly contentType: 'application/pdf';
    readonly content: Uint8Array;
  };
}

/**
 * Sends that message. The application decides when and what; the adapter
 * (`infrastructure/mail`) is the only place that talks to a mail server.
 */
export interface ReportMailerPort {
  send(mail: ReportMail): Promise<void>;
}
