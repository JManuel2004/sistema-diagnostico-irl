import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query client of the project.
 *
 * Policy taken from `apps/web/docs/STATE_MANAGEMENT.md`:
 *   - Do not retry 4xx — a malformed request does not turn into a 200.
 *   - One retry on transient errors (5xx / network).
 *   - `refetchOnWindowFocus: false` — our queries are catalogs or
 *     snapshots; aggressive refetching on focus is noise.
 *
 * Per-query overrides (`staleTime`, `gcTime`) live with each feature's
 * hook, not here. See STATE_MANAGEMENT §"Configuration per query".
 */
function isHttpError(error: unknown): error is { status: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  );
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isHttpError(error) && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * How long each kind of server data stays fresh. Saved results (profile,
 * recommendation, roadmap) are immutable snapshots; the diagnostic itself
 * changes as the user moves through the wizard; catalogs almost never
 * change.
 */
export const STALE_TIME = {
  diagnostic: 30 * 1000,
  diagnosticInput: 60 * 1000,
  savedResult: 5 * 60 * 1000,
  catalog: 60 * 60 * 1000,
} as const;
