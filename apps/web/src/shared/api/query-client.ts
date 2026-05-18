import { QueryClient } from '@tanstack/react-query';

/**
 * Cliente TanStack Query del proyecto.
 *
 * Política tomada de `apps/web/docs/STATE_MANAGEMENT.md`:
 *   - No reintentar 4xx — una petición malformada no se vuelve 200.
 *   - Un reintento en errores transitorios (5xx / red).
 *   - `refetchOnWindowFocus: false` — nuestras queries son catálogos
 *     o snapshots; refetch agresivo en foco es ruido.
 *
 * Los overrides por query (`staleTime`, `gcTime`) viven con el hook
 * de cada feature, no aquí. Ver STATE_MANAGEMENT §"Configuration per
 * query".
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
