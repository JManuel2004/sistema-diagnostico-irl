import { useEffect, useState, type FormEvent, type JSX, type ReactNode } from 'react';
import { enterWithCredentials, fetchAuthBypass } from '@features/auth/api/auth-mode.api';
import { useSessionLiveness } from '@features/auth';
import { hasStoredSession, redirectToSso } from '@/shared/auth/session';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Input } from '@/shared/ui/field';
import { PageShell } from '@/shared/ui/page-shell';

/**
 * Route guard — INNLAB ecosystem session (HU-01 / RF-00).
 *
 * Without a stored session, it asks the API which door this deploy uses.
 * A testing deploy shows an email and password form. Any other deploy
 * sends the user to Core's Hub, remembering the requested route to return
 * to it after the code exchange.
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

type Phase = 'checking' | 'form' | 'submitting' | 'redirecting';

export function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const [authenticated, setAuthenticated] = useState(hasStoredSession);
  const [phase, setPhase] = useState<Phase>(authenticated ? 'redirecting' : 'checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [entryError, setEntryError] = useState<string | null>(null);

  useSessionLiveness();

  useEffect(() => {
    if (authenticated) return;

    let cancelled = false;
    void fetchAuthBypass()
      .then((bypass) => {
        if (cancelled) return;
        if (bypass) {
          setPhase('form');
          return;
        }
        setPhase('redirecting');
        redirectToSso(window.location.pathname + window.location.search);
      })
      .catch(() => {
        if (cancelled) return;
        setPhase('redirecting');
        redirectToSso(window.location.pathname + window.location.search);
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated]);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPhase('submitting');
    setEntryError(null);
    try {
      const result = await enterWithCredentials(email, password);
      if (result === 'ok') {
        setAuthenticated(true);
        return;
      }
      if (result === 'closed') {
        setPhase('redirecting');
        redirectToSso(window.location.pathname + window.location.search);
        return;
      }
      setPhase('form');
      setEntryError('Correo o contraseña incorrectos.');
    } catch {
      setPhase('form');
      setEntryError('No se pudo abrir la sesión. Intenta de nuevo.');
    }
  }

  if (authenticated) {
    return <>{children}</>;
  }

  return (
    <PageShell width="reading">
      <Card>
        <CardContent className="p-6">
          <p className="text-overline text-azul-icesi">Inicio de sesión</p>
          {phase === 'form' || phase === 'submitting' ? (
            <form className="mt-4 flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
              <h1 className="text-foreground text-xl font-semibold">Entra con tu correo</h1>
              <p className="text-muted-foreground text-sm">
                Entrada de prueba. Cada persona usa su propio correo y contraseña.
              </p>
              <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="login-email">
                Correo
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  required
                  disabled={phase === 'submitting'}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium" htmlFor="login-password">
                Contraseña
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  required
                  disabled={phase === 'submitting'}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              {entryError !== null ? (
                <p className="text-destructive text-sm" role="alert">
                  {entryError}
                </p>
              ) : null}
              <Button type="submit" disabled={phase === 'submitting'}>
                Entrar
              </Button>
            </form>
          ) : (
            <p className="text-foreground mt-2 text-base" role="status" aria-live="polite">
              {phase === 'checking'
                ? 'Comprobando el ingreso…'
                : 'Redirigiendo a INNLAB para iniciar sesión…'}
            </p>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
