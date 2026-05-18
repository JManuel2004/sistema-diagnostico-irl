import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

/**
 * Error boundary global de la aplicación.
 *
 * React todavía exige un componente de clase para capturar errores de
 * renderizado — esta es la única clase tolerada en el frontend
 * (CLAUDE.web.md §"Stack assumptions"). Una excepción durante el
 * render aterriza aquí en vez de dejar la SPA en blanco.
 *
 * Los `feature`-level boundaries son recomendables cuando un widget
 * inestable (un gráfico, un widget de terceros) puede fallar sin
 * tumbar toda la página; se envuelve solo ese subárbol con su propio
 * fallback.
 */
interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // El reporting centralizado (Sentry o similar) se conectará en Stage 2.
    console.error('[ErrorBoundary]', error, info);
  }

  private readonly handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;

    return (
      <main
        role="alert"
        aria-labelledby="error-title"
        className="mx-auto my-16 max-w-lg space-y-4 p-8 text-center"
      >
        <h1 id="error-title" className="text-2xl font-semibold">
          Ocurrió un error inesperado
        </h1>
        <p className="text-muted-foreground">
          La aplicación encontró un problema y no pudo continuar. Por favor recargue la página. Si
          el error persiste, contacte al equipo INNLAB.
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium"
        >
          Recargar
        </button>
      </main>
    );
  }
}
