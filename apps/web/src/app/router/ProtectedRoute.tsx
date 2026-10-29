import { useEffect, useState, type JSX, type ReactNode } from 'react';
import {
  enterAsParticipant,
  fetchAuthMode,
  type AuthParticipant,
} from '@features/auth/api/auth-mode.api';
import { useSessionLiveness } from '@features/auth';
import { hasStoredSession, redirectToSso } from '@/shared/auth/session';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { PageShell } from '@/shared/ui/page-shell';

/**
 * Route guard — INNLAB ecosystem session (HU-01 / RF-00).
 *
 * Without a stored session, it asks the API which door this deploy uses.
 * A testing deploy lists five people and enters as the one chosen. Any
 * other deploy sends the user to Core's Hub, remembering the requested
 * route to return to it after the code exchange.
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

type Phase = 'checking' | 'choose' | 'entering' | 'redirecting';

export function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const [authenticated, setAuthenticated] = useState(hasStoredSession);
  const [phase, setPhase] = useState<Phase>(authenticated ? 'redirecting' : 'checking');
  const [participants, setParticipants] = useState<readonly AuthParticipant[]>([]);
  const [entryError, setEntryError] = useState<string | null>(null);

  useSessionLiveness();

  useEffect(() => {
    if (authenticated) return;

    let cancelled = false;
    void fetchAuthMode()
      .then((mode) => {
        if (cancelled) return;
        if (mode.bypass && mode.participants.length > 0) {
          setParticipants(mode.participants);
          setPhase('choose');
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

  async function choose(person: AuthParticipant): Promise<void> {
    setPhase('entering');
    setEntryError(null);
    try {
      const entered = await enterAsParticipant(person.id);
      if (!entered) {
        setPhase('redirecting');
        redirectToSso(window.location.pathname + window.location.search);
        return;
      }
      setAuthenticated(true);
    } catch {
      setPhase('choose');
      setEntryError('No se pudo abrir la sesión. Elige de nuevo.');
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
          {phase === 'choose' || phase === 'entering' ? (
            <div className="mt-4">
              <h1 className="text-foreground text-xl font-semibold">Elige con quién entras</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                Entrada de prueba. Cada persona tiene su propio diagnóstico y INNLAB no se usa.
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {participants.map((person) => (
                  <li key={person.id}>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-auto w-full justify-start px-4 py-3 text-left"
                      disabled={phase === 'entering'}
                      onClick={() => void choose(person)}
                    >
                      <span className="flex flex-col items-start gap-0.5">
                        <span>
                          {person.firstName} {person.lastName}
                        </span>
                        <span className="text-muted-foreground text-sm font-normal">
                          {person.companyName ?? 'Sin empresa'}
                        </span>
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
              {entryError !== null ? (
                <p className="text-destructive mt-3 text-sm" role="alert">
                  {entryError}
                </p>
              ) : null}
            </div>
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
