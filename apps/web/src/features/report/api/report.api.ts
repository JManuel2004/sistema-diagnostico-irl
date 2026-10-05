import { diagnosticReportSchema, type DiagnosticReport } from '@innlab/contracts';
import { getFile, getParsed, type DownloadedFile } from '@/shared/api/http';

export function getDiagnosticReport(diagnosticId: string): Promise<DiagnosticReport> {
  return getParsed(`/diagnostics/${diagnosticId}/report`, diagnosticReportSchema);
}

/** The full report as a PDF file (HU-24). */
export function downloadDiagnosticReport(diagnosticId: string): Promise<DownloadedFile> {
  return getFile(`/diagnostics/${diagnosticId}/report/pdf`);
}
