import type { FindDiagnosisOwnerQuery } from '../../../diagnosis/application/use-cases/find-diagnosis-owner.query.js';
import type { ReportNotificationSettings } from '../report-notification.js';
import type { ReportMailerPort } from '../ports/report-mailer.port.js';
import type { DownloadDiagnosticReportUseCase } from './download-diagnostic-report.use-case.js';

/**
 * Mails the full report to INNLAB once the deep analysis is complete
 * (HU-25). The file is the same PDF the leader can download.
 *
 * It does nothing when mail is not configured, when the diagnostic has
 * no owner, or when the report does not exist yet (phase 1 only). A
 * failure of the mail server is left to the caller: the listener records
 * it and the report stays available on screen.
 */
export class NotifyInnlabOfCompletedReportUseCase {
  constructor(
    private readonly owners: FindDiagnosisOwnerQuery,
    private readonly download: DownloadDiagnosticReportUseCase,
    private readonly mailer: ReportMailerPort,
    private readonly settings: ReportNotificationSettings,
  ) {}

  async execute(diagnosticId: string): Promise<void> {
    if (!this.settings.enabled) return;

    const userId = await this.owners.execute(diagnosticId);
    if (!userId) return;

    const file = await this.download.execute({ diagnosticId, userId });
    if (!file.ok) {
      if (file.error.code === 'REPORT_NOT_AVAILABLE') return;
      throw file.error;
    }

    await this.mailer.send({
      to: this.settings.to,
      subject: `Reporte IRL completo: ${file.value.fileName}`,
      text: [
        'El análisis profundo de una iniciativa quedó completo.',
        'El reporte completo va adjunto en PDF.',
        'El diagnóstico sigue disponible para el líder desde la plataforma.',
      ].join('\n'),
      attachment: {
        fileName: file.value.fileName,
        contentType: file.value.contentType,
        content: file.value.content,
      },
    });
  }
}
