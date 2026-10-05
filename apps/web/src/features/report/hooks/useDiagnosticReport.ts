import { queryKeys } from '@/shared/api/query-keys';
import { STALE_TIME } from '@/shared/api/query-client';
import { useDiagnosticQuery } from '@/shared/hooks/useDiagnosticQuery';
import { getDiagnosticReport } from '../api/report.api';

/**
 * The full report gathers saved results, as stable as each of them. It is
 * requested only when the diagnostic says its deep analysis is complete
 * (`enabled`): before that the backend answers 409 and there is nothing to
 * ask for.
 */
export function useDiagnosticReport(diagnosticId: string | undefined, enabled: boolean) {
  return useDiagnosticQuery(diagnosticId, queryKeys.diagnostic.report, getDiagnosticReport, {
    staleTime: STALE_TIME.savedResult,
    enabled,
  });
}
