import type { JSX } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useSsoExchange } from '@features/auth';
import { redirectToSso } from '@/shared/auth/session';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { PageShell } from '@/shared/ui/page-shell';

/**
 * Retorno del SSO de INNLAB (HU-01 / RF-00).
 *
 * El Hub devuelve al usuario aquí con `?code=xxxx`. Esta pantalla canjea
 * ese código por los tokens, los guarda y devuelve al usuario a donde
 * quería ir.
 *
 * Debe ser una ruta pública: por definición el usuario todavía no tiene
 * sesión cuando llega. Envolverla en `<ProtectedRoute>` la mandaría de
 * vuelta al Hub en un bucle.
 *
 * El código expira en 30 segundos, así que la pantalla no muestra nada
 * pesado mientras canjea, y ante un fallo ofrece rehacer el flujo completo
 * en vez de reintentar con un código ya gastado.
 */
export default function AuthCallbackPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const { status, error, returnTo } = useSsoExchange(searchParams.get('code'));

  if (status === 'done') {
    return <Navigate to={returnTo} replace />;
  }

  if (status === 'error') {
    return (
      <PageShell width="reading">
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-overline text-azul-icesi">Inicio de sesión</p>
            <h1 className="text-foreground text-2xl font-bold leading-tight tracking-tight">
              No pudimos completar tu inicio de sesión
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {error ?? 'Ocurrió un error inesperado durante el inicio de sesión.'}
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              El enlace de acceso caduca a los 30 segundos. Vuelve a intentarlo para
              generar uno nuevo.
            </p>
            <div className="pt-2">
              <Button
                onClick={() => {
                  redirectToSso();
                }}
              >
                Intentar de nuevo
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell width="reading">
      <Card>
        <CardContent className="p-6">
          <p className="text-overline text-azul-icesi">Inicio de sesión</p>
          <p className="text-foreground mt-2 text-base" role="status" aria-live="polite">
            Conectando con tu cuenta de INNLAB…
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
