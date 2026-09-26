import type { JSX, ReactNode } from 'react';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { LoadingState } from '@/shared/ui/loading-state';
import { useCurrentUser } from '../hooks/useCurrentUser';

interface UserContextGateProps {
  /** Rendered only once the user's context is available. */
  readonly children: ReactNode;
}

/**
 * Starting a diagnostic requires knowing the user (DIAGIRL-25).
 *
 * Scenario "user context unavailable": a diagnostic belongs to whoever
 * takes it, so starting one without knowing who that is would create a
 * record nobody can claim. On a failure the action is withdrawn and the
 * reason given, instead of leaving it active to fail later.
 *
 * While loading, the action is hidden too, but without an error message:
 * nothing has failed yet.
 */
export function UserContextGate({ children }: UserContextGateProps): JSX.Element {
  const { isPending, isError, refetch, isFetching } = useCurrentUser();

  if (isPending) return <LoadingState label="Comprobando tu sesión…" />;

  if (isError) {
    return (
      <Alert
        tone="critical"
        title="Servicio no disponible"
        action={
          <Button
            variant="secondary"
            size="sm"
            disabled={isFetching}
            onClick={() => {
              void refetch();
            }}
          >
            {isFetching ? 'Reintentando…' : 'Reintentar'}
          </Button>
        }
      >
        <p>
          No pudimos obtener tu perfil desde INNLAB. El servicio no está disponible temporalmente,
          así que no es posible iniciar un diagnóstico en este momento.
        </p>
        <p className="mt-2">Tu sesión sigue activa. Vuelve a intentarlo en unos minutos.</p>
      </Alert>
    );
  }

  return <>{children}</>;
}
