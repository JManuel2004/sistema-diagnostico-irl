import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { JSX, PropsWithChildren } from 'react';
import { queryClient } from '@shared/api/query-client';

/**
 * Injects the shared `QueryClient` (`@shared/api/query-client`) into the
 * React tree. The Devtools are always included — the bundler (Vite) drops
 * them in `production` through the `NODE_ENV !== 'production'` flag the
 * package checks internally.
 */
export function QueryProvider({ children }: PropsWithChildren): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
