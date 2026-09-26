import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';

/**
 * Anything that moves a diagnostic's state in the backend (consent,
 * initiative, questionnaire, deep analysis) makes the cached diagnostic and
 * the user's list stale: both carry flags the screens decide on
 * (`completed`, `deepAnalysisAccepted`). The promise resolves once both are
 * refetched, so a caller can wait before navigating.
 */
export async function invalidateDiagnostic(
  queryClient: QueryClient,
  diagnosticId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.detail(diagnosticId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.list }),
  ]);
}
