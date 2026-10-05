import type { DomainError } from '../../../../shared/kernel/domain/errors/domain-error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import {
  buildReportDocument,
  reportFileName,
} from '../dtos/report-document.js';
import type { ReportRendererPort } from '../ports/report-renderer.port.js';
import type {
  GetDiagnosticReportQuery,
  GetDiagnosticReportUseCase,
} from './get-diagnostic-report.use-case.js';

/** The downloadable report: its bytes and the name it is saved with. */
export interface ReportFile {
  readonly fileName: string;
  readonly contentType: 'application/pdf';
  readonly content: Uint8Array;
}

/**
 * The full report as a PDF file (RF-16 / HU-24).
 *
 * It is the same report the screen shows (`GetDiagnosticReportUseCase`),
 * so it has the same rules: only the caller's diagnostic (404 otherwise),
 * and only once the deep analysis is complete (`REPORT_NOT_AVAILABLE`,
 * 409). Nothing is drawn before both hold.
 */
export class DownloadDiagnosticReportUseCase {
  constructor(
    private readonly getReport: GetDiagnosticReportUseCase,
    private readonly renderer: ReportRendererPort,
  ) {}

  async execute(
    query: GetDiagnosticReportQuery,
  ): Promise<Result<ReportFile, DomainError>> {
    const report = await this.getReport.execute(query);
    if (!report.ok) return report;

    const content = await this.renderer.render(
      buildReportDocument(report.value),
    );
    return Result.ok({
      fileName: reportFileName(report.value),
      contentType: 'application/pdf',
      content,
    });
  }
}
