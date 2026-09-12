import type { JSX, ReactNode } from 'react';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { useCurrentUser } from '../hooks/useCurrentUser';

interface UserContextGateProps {
  /** Se renderiza solo cuando el contexto del usuario está disponible. */
  readonly children: ReactNode;
}

/**
 * Condiciona el inicio de un diagnóstico a conocer al usuario (DIAGIRL-25).
 *
 * Escenario "contexto de usuario no disponible": un diagnóstico se asocia
 * a quien lo hace, así que permitir arrancarlo sin saber quién es
 * produciría un registro huérfano que después nadie puede reclamar. Por
 * eso, ante un fallo, se informa y se retira la acción en vez de dejarla
 * activa y fallar más adelante.
 *
 * El estado de carga también oculta la acción, pero sin mensaje de error:
 * todavía no ha fallado nada.
 */
export function UserContextGate({ children }: UserContextGateProps): JSX.Element {
  const { isPending, isError, refetch, isFetching } = useCurrentUser();

  if (isPending) {
    return (
      <p className="text-muted-foreground text-sm" role="status" aria-live="polite">
        Comprobando tu sesión…
      </p>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="space-y-3 p-5">
          <p className="text-overline text-azul-icesi">Servicio no disponible</p>
          <p className="text-foreground text-sm leading-relaxed" role="alert">
            No pudimos obtener tu perfil desde INNLAB. El servicio no está disponible
            temporalmente, así que no es posible iniciar un diagnóstico en este momento.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Tu sesión sigue activa. Vuelve a intentarlo en unos minutos.
          </p>
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
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
