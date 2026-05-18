import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { JSX, PropsWithChildren } from 'react';
import { queryClient } from '@shared/api/query-client';

/**
 * Inyecta el `QueryClient` compartido (`@shared/api/query-client`) en
 * el árbol React. Los Devtools se incluyen siempre — el bundler
 * (Vite) los excluye automáticamente en `production` vía el flag
 * `NODE_ENV !== 'production'` que el paquete consulta internamente.
 */
export function QueryProvider({ children }: PropsWithChildren): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
