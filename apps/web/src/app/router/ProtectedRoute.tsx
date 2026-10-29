import { useEffect, useState, type JSX, type ReactNode } from 'react';
import {
  enterAsSimulatedUser,
  fetchSimulatedSignIn,
  type SimulatedUser,
} from '@features/auth/api/auth-mode.api';
import { useSessionLiveness } from '@features/auth';
import { hasStoredSession, redirectToSso } from '@/shared/auth/session';

/**
 * Route guard — INNLAB ecosystem session (HU-01 / RF-00).
 *
 * Without a stored session, it asks the API which door this deploy uses.
 * A testing deploy shows the same screen as the Bitbucket sign-in
 * simulator: the yellow note and one card per test person. Any other
 * deploy sends the user to Core's Hub, remembering the requested route
 * to return to it after the code exchange.
 *
 * The cards are buttons, not links: pressing one asks this API for a
 * session. The simulator's own process is not called.
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

type Phase = 'checking' | 'chooser' | 'submitting' | 'redirecting';

const SIMULATED_SIGN_IN_CSS = `
  .simulated-sign-in {
    position: fixed;
    inset: 0;
    z-index: 50;
    overflow: auto;
    font-family: system-ui, sans-serif;
    background: #f4f6fb;
    color: #1f2937;
    margin: 0;
  }
  .simulated-sign-in main { max-width: 32rem; margin: 3rem auto; padding: 0 1rem; }
  .simulated-sign-in .banner { background: #fef3c7; border: 1px solid #f59e0b; border-radius: .5rem; padding: .75rem 1rem; margin-bottom: 1.5rem; }
  .simulated-sign-in h1 { font-size: 1.4rem; }
  .simulated-sign-in ul { list-style: none; padding: 0; display: grid; gap: .75rem; }
  .simulated-sign-in button.user {
    display: block;
    width: 100%;
    text-align: left;
    font: inherit;
    cursor: pointer;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: .5rem;
    padding: 1rem;
    color: inherit;
    text-decoration: none;
  }
  .simulated-sign-in button.user:hover, .simulated-sign-in button.user:focus { border-color: #2563eb; outline: 2px solid #2563eb; }
  .simulated-sign-in .name { font-weight: 600; }
  .simulated-sign-in .meta { font-size: .9rem; color: #4b5563; }
  .simulated-sign-in .entry-error { margin: 0 0 1rem; }
`;

export function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const [authenticated, setAuthenticated] = useState(hasStoredSession);
  const [phase, setPhase] = useState<Phase>(authenticated ? 'redirecting' : 'checking');
  const [people, setPeople] = useState<readonly SimulatedUser[]>([]);
  const [entryError, setEntryError] = useState<string | null>(null);

  useSessionLiveness();

  useEffect(() => {
    if (authenticated) return;

    let cancelled = false;
    void fetchSimulatedSignIn()
      .then((roster) => {
        if (cancelled) return;
        if (roster !== null) {
          setPeople(roster);
          setPhase('chooser');
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

  async function choose(userId: string): Promise<void> {
    setPhase('submitting');
    setEntryError(null);
    try {
      const result = await enterAsSimulatedUser(userId);
      if (result === 'ok') {
        setAuthenticated(true);
        return;
      }
      if (result === 'closed') {
        setPhase('redirecting');
        redirectToSso(window.location.pathname + window.location.search);
        return;
      }
      setPhase('chooser');
      setEntryError('No se pudo abrir la sesión de esa persona.');
    } catch {
      setPhase('chooser');
      setEntryError('No se pudo abrir la sesión. Intenta de nuevo.');
    }
  }

  if (authenticated) {
    return <>{children}</>;
  }

  if (phase === 'chooser' || phase === 'submitting') {
    return (
      <SimulatedSignIn
        people={people}
        busy={phase === 'submitting'}
        error={entryError}
        onChoose={(userId) => void choose(userId)}
      />
    );
  }

  return (
    <div className="simulated-sign-in" role="status" aria-live="polite">
      <style>{SIMULATED_SIGN_IN_CSS}</style>
      <main>
        {phase === 'checking'
          ? 'Comprobando el ingreso…'
          : 'Redirigiendo a INNLAB para iniciar sesión…'}
      </main>
    </div>
  );
}

function SimulatedSignIn({
  people,
  busy,
  error,
  onChoose,
}: {
  readonly people: readonly SimulatedUser[];
  readonly busy: boolean;
  readonly error: string | null;
  readonly onChoose: (userId: string) => void;
}): JSX.Element {
  return (
    <div className="simulated-sign-in">
      <style>{SIMULATED_SIGN_IN_CSS}</style>
      <main>
        <div className="banner" role="note">
          <strong>Modo simulado.</strong> Este inicio de sesión no usa INNLAB ni Cognito. Sirve
          solo para demostraciones y pruebas.
        </div>
        <h1>Elige un usuario de prueba</h1>
        {error !== null ? (
          <p className="entry-error" role="alert">
            {error}
          </p>
        ) : null}
        <ul>
          {people.map((person) => {
            const company = person.companyName === null ? 'Sin organización' : person.companyName;
            return (
              <li key={person.id}>
                <button
                  type="button"
                  className="user"
                  disabled={busy}
                  onClick={() => onChoose(person.id)}
                >
                  <span className="name">
                    {person.firstName} {person.lastName}
                  </span>
                  <br />
                  <span className="meta">{person.email}</span>
                  <br />
                  <span className="meta">{company}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
