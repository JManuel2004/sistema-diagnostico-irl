import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotifyInnlabOfCompletedReportUseCase } from '../../../../../../src/modules/reporting/application/use-cases/notify-innlab-of-completed-report.use-case.js';
import type { FindDiagnosisOwnerQuery } from '../../../../../../src/modules/diagnosis/application/use-cases/find-diagnosis-owner.query.js';
import type { DownloadDiagnosticReportUseCase } from '../../../../../../src/modules/reporting/application/use-cases/download-diagnostic-report.use-case.js';
import type { ReportMailerPort } from '../../../../../../src/modules/reporting/application/ports/report-mailer.port.js';
import type { ReportNotificationSettings } from '../../../../../../src/modules/reporting/application/report-notification.js';
import { ReportNotAvailableError } from '../../../../../../src/modules/reporting/domain/exceptions/report.errors.js';
import { Result } from '../../../../../../src/shared/kernel/domain/result.js';
import { DIAGNOSTIC_ID } from '../../support/report-sections.js';

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
const ENABLED: ReportNotificationSettings = {
  enabled: true,
  to: 'innlab@example.com',
  from: 'noreply@innlab.icesi.edu.co',
};

describe('NotifyInnlabOfCompletedReportUseCase', () => {
  let owner: jest.Mock<FindDiagnosisOwnerQuery['execute']>;
  let download: jest.Mock<DownloadDiagnosticReportUseCase['execute']>;
  let send: jest.Mock<ReportMailerPort['send']>;
  let useCase: NotifyInnlabOfCompletedReportUseCase;

  beforeEach(() => {
    owner = jest.fn<FindDiagnosisOwnerQuery['execute']>().mockResolvedValue('user-1');
    download = jest.fn<DownloadDiagnosticReportUseCase['execute']>().mockResolvedValue(
      Result.ok({
        fileName: 'reporte-irl-agroconecta-2026-01-02.pdf',
        contentType: 'application/pdf',
        content: PDF,
      }),
    );
    send = jest.fn<ReportMailerPort['send']>().mockResolvedValue(undefined);
    useCase = new NotifyInnlabOfCompletedReportUseCase(
      { execute: owner } as unknown as FindDiagnosisOwnerQuery,
      { execute: download } as unknown as DownloadDiagnosticReportUseCase,
      { send },
      ENABLED,
    );
  });

  it('mails the PDF of the completed report to the configured address', async () => {
    await useCase.execute(DIAGNOSTIC_ID);

    expect(download).toHaveBeenCalledWith({ diagnosticId: DIAGNOSTIC_ID, userId: 'user-1' });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'innlab@example.com',
        subject: 'Reporte IRL completo: reporte-irl-agroconecta-2026-01-02.pdf',
        attachment: {
          fileName: 'reporte-irl-agroconecta-2026-01-02.pdf',
          contentType: 'application/pdf',
          content: PDF,
        },
      }),
    );
  });

  it('sends nothing when mail is not configured', async () => {
    useCase = new NotifyInnlabOfCompletedReportUseCase(
      { execute: owner } as unknown as FindDiagnosisOwnerQuery,
      { execute: download } as unknown as DownloadDiagnosticReportUseCase,
      { send },
      { enabled: false, to: '', from: ENABLED.from },
    );

    await useCase.execute(DIAGNOSTIC_ID);

    expect(download).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('sends nothing when the deep analysis is not complete', async () => {
    download.mockResolvedValueOnce(Result.err(new ReportNotAvailableError(DIAGNOSTIC_ID)));

    await useCase.execute(DIAGNOSTIC_ID);

    expect(send).not.toHaveBeenCalled();
  });

  it('sends nothing when the diagnostic has no owner', async () => {
    owner.mockResolvedValueOnce(null);

    await useCase.execute(DIAGNOSTIC_ID);

    expect(download).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('lets a mail failure surface so the listener can record it', async () => {
    send.mockRejectedValueOnce(new Error('smtp down'));

    await expect(useCase.execute(DIAGNOSTIC_ID)).rejects.toThrow('smtp down');
  });
});
