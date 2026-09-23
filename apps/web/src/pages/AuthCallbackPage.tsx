import type { JSX } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useSsoExchange } from '@features/auth';
import { redirectToSso } from '@/shared/auth/session';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { PageShell } from '@/shared/ui/page-shell';

/**
 * Return from the INNLAB SSO (HU-01 / RF-00).
 *
 * The Hub sends the user back here with `?code=xxxx`. This screen exchanges
 * that code for the tokens, stores them and takes the user back to where
 * they wanted to go.
 *
 * It must be a public route: by definition the user has no session yet
 * when arriving. Wrapping it in `<ProtectedRoute>` would send it back to the
 * Hub in a loop.
 *
 * The code expires in 30 seconds, so the screen shows nothing heavy while
 * exchanging, and on failure it offers to redo the whole flow instead of
 * retrying with an already spent code.
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
