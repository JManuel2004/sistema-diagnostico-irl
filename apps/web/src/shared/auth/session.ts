import { coreSessionSchema, type CoreSession } from '@innlab/contracts';

export type { CoreSession };

/**
 * INNLAB ecosystem session — storage and SSO bootstrap.
 *
 * It lives in `shared/` and not in `features/auth/` because the
 * `shared/api/http.ts` interceptor needs the access token, and the boundary
 * rules forbid `shared` from importing a feature.
 *
 * The real INNLAB flow (confirmed against Core's guide) is:
 *
 *   app without session → {CORE_URL}/auth/sso?redirect=<our callback url>
 *     → the Hub authenticates against Cognito if needed
 *     → comes back to our app with ?code=xxxx  (single use, TTL 30s)
 *     → GET {CORE_API_URL}/auth/sso/exchange?code=xxxx
 *     → { token: <id_token>, accessToken: <access_token> }
 *
 * `token` is the id_token and does NOT authenticate: Core requires
 * `token_use === 'access'` and answers 401 if the id_token is used. Both
 * are kept because the contract delivers them together, but the Bearer is
 * always `accessToken`.
 *
 * There is no refresh token. The session is kept alive by passive polling
 * (`useSessionLiveness`), not by renewal.
 */
const STORAGE_KEY = 'innlab.session.v1';

/** Route to return to once the code exchange completes. */
const RETURN_TO_KEY = 'innlab.session.return-to';

function coreUrl(): string {
  return String(import.meta.env.VITE_CORE_URL ?? '');
}

/** URL the Hub must return the `?code=` to. */
export function ssoCallbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

export function readSession(): CoreSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;

    // The browser storage can be edited outside the application: what is
    // read is `unknown` until it passes the contract's schema.
    const parsed = coreSessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    // localStorage blocked or corrupt JSON: no usable session.
    return null;
  }
}

export function saveSession(session: CoreSession): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function hasStoredSession(): boolean {
  return readSession() !== null;
}

export function getAccessToken(): string | null {
  return readSession()?.accessToken ?? null;
}

/**
 * Stores where the user wanted to go before being sent to the Hub.
 *
 * It does not travel as a query param: Core appends `?code=` to the redirect
 * URL and depending on how it composes the query string is not wanted.
 * `sessionStorage` dies with the tab, which is exactly the lifetime needed.
 */
export function rememberReturnTo(path: string): void {
  try {
    window.sessionStorage.setItem(RETURN_TO_KEY, path);
  } catch {
    // Without sessionStorage the deep link is lost, not the session.
  }
}

export function consumeReturnTo(): string | null {
  try {
    const path = window.sessionStorage.getItem(RETURN_TO_KEY);
    window.sessionStorage.removeItem(RETURN_TO_KEY);
    return path;
  } catch {
    return null;
  }
}

/**
 * Sends the user to the INNLAB Hub to authenticate.
 *
 * A direct assignment to `window.location` — it is an exit from the SPA,
 * not a router navigation: the Hub brings the user back on `/auth/callback`.
 */
export function redirectToSso(returnTo?: string): void {
  // The Hub route is `/auth/sso`, NOT `/sso`: its router has no such
  // second route and the user lands on a blank screen with
  // "No routes matched location" in the console, with no network error to
  // give it away. The Hub does `new URL(redirect)`, so it must be absolute.
  if (returnTo !== undefined && returnTo !== '') {
    rememberReturnTo(returnTo);
  }

  const redirect = encodeURIComponent(ssoCallbackUrl());
  window.location.href = `${coreUrl()}/auth/sso?redirect=${redirect}`;
}
