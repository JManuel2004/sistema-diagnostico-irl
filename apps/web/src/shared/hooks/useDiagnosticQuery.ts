import { useQuery, type QueryKey, type UseQueryResult } from '@tanstack/react-query';

/**
 * A query about one diagnostic whose id may not be known yet (a route
 * param, a list still loading). Until there is an id the query stays
 * disabled under its own key, so two resources never share a cache entry.
 */
export function useDiagnosticQuery<T>(
  diagnosticId: string | undefined,
  keyOf: (diagnosticId: string) => QueryKey,
  fetch: (diagnosticId: string) => Promise<T>,
  options: { readonly staleTime: number; readonly enabled?: boolean },
): UseQueryResult<T> {
  return useQuery({
    queryKey: keyOf(diagnosticId ?? ''),
    queryFn: () => fetch(diagnosticId ?? ''),
    enabled: diagnosticId !== undefined && diagnosticId !== '' && (options.enabled ?? true),
    staleTime: options.staleTime,
  });
}
