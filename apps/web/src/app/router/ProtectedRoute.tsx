import { useEffect, useState, type JSX, type ReactNode } from 'react';
import { fetchAuthBypass, openBypassSession } from '@features/auth/api/auth-mode.api';
import { useSessionLiveness } from '@features/auth';
import { hasStoredSession, redirectToSso } from '@/shared/auth/session';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { PageShell } from '@/shared/ui/page-shell';

/**
 * Route guard — INNLAB ecosystem session (HU-01 / RF-00).
 *
 * Without a stored session, it sends the user out of the SPA to Core's Hub,
 * remembering the requested route to return to it after the code exchange.
 *
 * The check is local (is there a stored token?), not a validation of the
 * token: validating it here would add a network call before every screen.
 * A stored but dead token is detected in two ways already in place — the
 * 401 of the `shared/api/http` interceptor and `useSessionLiveness` when
 * the tab regains focus — and both redo the SSO.
 *
 * The redirect lives in an effect and not in the render body: mutating
 * `window.location` during render is a side effect React may run twice
 * under StrictMode.
 */
interface ProtectedRouteProps {
  readonly children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const [authenticated, setAuthenticated] = useState(hasStoredSession);
  // `null` while the API has not answered. A stored session does not ask.
  const [bypass, setBypass] = useState<boolean | null>(authenticated ? false : null);
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState<string | null>(null);

  useSessionLiveness();

  useEffect(() => {
    if (authenticated) return;

    let cancelled = false;
    void fetchAuthBypass().then((enabled) => {
      if (!cancelled) setBypass(enabled);
    });

    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated && bypass === false) {
      redirectToSso(window.location.pathname + window.location.search);
    }
  }, [authenticated, bypass]);

  if (authenticated) {
    return <>{children}</>;
  }

  if (bypass === true) {
    return (
      <PageShell width="reading">
        <Card>
          <CardContent className="flex flex-col gap-4 p-6">
            <p className="text-overline text-azul-icesi">Inicio de sesión</p>
            <p className="text-foreground text-base">
              INNLAB puede estar caído. Entra con tu cuenta o continúa sin ella para usar el
              diagnóstico.
            </p>
            {enterError !== null ? <p className="text-destructive text-sm">{enterError}</p> : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                disabled={entering}
                onClick={() => {
                  redirectToSso(window.location.pathname + window.location.search);
                }}
              >
                Entrar con INNLAB
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={entering}
                onClick={() => {
                  setEntering(true);
                  setEnterError(null);
                  void openBypassSession()
                    .then(() => {
                      setAuthenticated(true);
                    })
                    .catch(() => {
                      setEnterError('No se pudo abrir la sesión de respaldo. Inténtalo de nuevo.');
                      setEntering(false);
                    });
                }}
              >
                {entering ? 'Entrando…' : 'Continuar sin INNLAB'}
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
            {bypass === null
              ? 'Comprobando el inicio de sesión…'
              : 'Redirigiendo a INNLAB para iniciar sesión…'}
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
