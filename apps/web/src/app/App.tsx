import type { JSX } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './providers/ErrorBoundary';
import { QueryProvider } from './providers/QueryProvider';
import { ToastProvider } from './providers/ToastProvider';
import { AppRoutes } from './router/routes';

/**
 * Composition of the application shell.
 *
 * Order of the providers (outside in):
 *  1. `ErrorBoundary` — catches render failures in any provider or page
 *     below; it must wrap everything so an exception while initializing
 *     the QueryClient or the router lands here instead of leaving a blank
 *     screen.
 *  2. `QueryProvider` — owner of the singleton `QueryClient`; it must wrap
 *     every consumer of `useQuery` / `useMutation`.
 *  3. `ToastProvider` — mounts Sonner's region; pages can call
 *     `toast.success(...)` from here down.
 *  4. `BrowserRouter` — keeps the SPA route in `window.location`.
 *  5. `AppRoutes` — the route table.
 */
export function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}
