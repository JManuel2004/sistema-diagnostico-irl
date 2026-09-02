import { useEffect, type JSX, type ReactNode } from 'react';
import { useSessionLiveness } from '@features/auth';
import { hasStoredSession, redirectToSso } from '@/shared/auth/session';
import { Card, CardContent } from '@/shared/ui/card';
import { PageShell } from '@/shared/ui/page-shell';

/**
 * Guardia de ruta — sesión del ecosistema INNLAB (HU-01 / RF-00).
 *
 * Sin sesión almacenada, saca al usuario del SPA hacia el Hub de Core,
 * recordando la ruta pedida para volver a ella tras el canje del código.
 *
 * La comprobación es local (¿hay token guardado?), no una validación del
 * token: validarlo aquí añadiría una llamada de red antes de cada pantalla.
 * Un token guardado pero muerto se detecta por dos vías ya montadas —
 * el 401 del interceptor de `shared/api/http` y `useSessionLiveness` al
 * volver el foco a la pestaña — y ambas rehacen el SSO.
 *
 * El redirect va en un efecto y no en el cuerpo del render: mutar
 * `window.location` durante el render es un efecto secundario que React
 * puede ejecutar dos veces bajo StrictMode.
 */
interface ProtectedRouteProps {
  readonly children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const authenticated = hasStoredSession();

  useSessionLiveness();

  useEffect(() => {
    if (!authenticated) {
      redirectToSso(window.location.pathname + window.location.search);
    }
  }, [authenticated]);

  if (!authenticated) {
    return (
      <PageShell width="reading">
        <Card>
          <CardContent className="p-6">
            <p className="text-overline text-azul-icesi">Inicio de sesión</p>
            <p className="text-foreground mt-2 text-base" role="status" aria-live="polite">
              Redirigiendo a INNLAB para iniciar sesión…
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return <>{children}</>;
}
