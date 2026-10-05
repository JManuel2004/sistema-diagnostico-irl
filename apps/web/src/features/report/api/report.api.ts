import { diagnosticReportSchema, type DiagnosticReport } from '@innlab/contracts';
import { getParsed } from '@/shared/api/http';

export function getDiagnosticReport(diagnosticId: string): Promise<DiagnosticReport> {
  return getParsed(`/diagnostics/${diagnosticId}/report`, diagnosticReportSchema);
}
