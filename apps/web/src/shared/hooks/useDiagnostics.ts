import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE_TIME } from '@/shared/api/query-client';
import { useDiagnosticQuery } from './useDiagnosticQuery';
import { getDiagnostic, listMyDiagnostics } from '@/shared/api/diagnostic.api';

/**
 * One diagnostic of the user. It carries `state`, `deepAnalysisAccepted` and
 * `deepAnalysisCompleted`, which the backend derives: the results and the
 * report decide what to show from those flags and infer nothing from the
 * state.
 */
export function useDiagnostic(diagnosticId: string | undefined) {
  return useDiagnosticQuery(diagnosticId, queryKeys.diagnostic.detail, getDiagnostic, {
    staleTime: STALE_TIME.diagnostic,
  });
}

/** The user's diagnostics, most recent first. */
export function useMyDiagnostics(enabled = true) {
  return useQuery({
    queryKey: queryKeys.diagnostic.list,
    queryFn: listMyDiagnostics,
    enabled,
    staleTime: STALE_TIME.diagnostic,
  });
}

/**
 * The active diagnostic: the one in the URL when inside one; otherwise the
 * most recent **with results** (`completed`). A diagnostic still in the
 * wizard has no results or panel to show. `undefined` while loading or if
 * the user has none finished.
 */
export function useActiveDiagnosticId(): string | undefined {
  const { id } = useParams<{ id: string }>();
  // Inside a diagnostic there is no need to ask for the list.
  const mine = useMyDiagnostics(id === undefined);
  return id ?? mine.data?.find((d) => d.completed)?.id;
}
