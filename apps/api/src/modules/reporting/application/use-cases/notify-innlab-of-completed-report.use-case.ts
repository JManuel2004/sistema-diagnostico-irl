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
      // It is an alert for a commercial contact (client validation of
      // RF-17): what the leader acquired, what was recommended, and what to do.
      text: [
        'Hola, equipo INNLAB:',
        '',
        'Un líder de iniciativa adquirió el análisis profundo de su diagnóstico IRL. Con él, el sistema le recomendó servicios de INNLAB y le propuso una ruta de escalamiento por fases para hacer crecer su iniciativa.',
        '',
        'Por favor, contáctalo para acompañarlo en los siguientes pasos.',
        '',
        'El reporte completo va adjunto en PDF: los datos de la iniciativa, su perfil de madurez, los desequilibrios, el servicio recomendado y la ruta de escalamiento. El líder también puede consultar su diagnóstico en la plataforma.',
      ].join('\n'),
      attachment: {
        fileName: file.value.fileName,
        contentType: file.value.contentType,
        content: file.value.content,
      },
    });
  }
}
