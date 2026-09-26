import { useEffect, type JSX, type ReactNode } from 'react';
import { useSessionLiveness } from '@features/auth';
import { hasStoredSession, redirectToSso } from '@/shared/auth/session';
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
