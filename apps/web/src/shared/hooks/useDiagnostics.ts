import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { queryKeys } from '@/shared/api/query-keys';
import { getDiagnostic, listMyDiagnostics } from '@/shared/api/diagnostic.api';

/**
 * One diagnostic of the user. It carries `state` and `deepAnalysisAccepted`,
 * which the backend derives: the results screen decides what to show from
 * that flag and infers nothing from the state.
 */
export function useDiagnostic(diagnosticId: string | undefined) {
  return useQuery({
    queryKey: diagnosticId
      ? queryKeys.diagnostic.detail(diagnosticId)
      : ['diagnostic', 'detail', 'idle'],
    queryFn: () => getDiagnostic(diagnosticId!),
    enabled: Boolean(diagnosticId),
    staleTime: 30 * 1000,
  });
}

/** The user's diagnostics, most recent first. */
export function useMyDiagnostics(enabled = true) {
  return useQuery({
    queryKey: queryKeys.diagnostic.list,
    queryFn: listMyDiagnostics,
    enabled,
    staleTime: 30 * 1000,
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
