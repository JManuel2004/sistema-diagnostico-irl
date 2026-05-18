import type { JSX } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './providers/ErrorBoundary';
import { QueryProvider } from './providers/QueryProvider';
import { ToastProvider } from './providers/ToastProvider';
import { AppRoutes } from './router/routes';

/**
 * Composición del shell de la aplicación.
 *
 * Orden de los providers (de afuera hacia adentro):
 *  1. `ErrorBoundary` — captura fallos de render en cualquier provider
 *     o página debajo; debe envolver todo para que una excepción al
 *     inicializar QueryClient o el router caiga aquí en vez de dejar
 *     una pantalla en blanco.
 *  2. `QueryProvider` — dueño del `QueryClient` singleton; debe envolver
 *     a cualquier consumidor de `useQuery` / `useMutation`.
 *  3. `ToastProvider` — monta el region de Sonner; las páginas pueden
 *     llamar `toast.success(...)` desde aquí hacia abajo.
 *  4. `BrowserRouter` — mantiene la ruta SPA en `window.location`.
 *  5. `AppRoutes` — la tabla de rutas.
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
