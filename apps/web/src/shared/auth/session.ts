/**
 * Sesión del ecosistema INNLAB — almacenamiento y arranque del SSO.
 *
 * Vive en `shared/` y no en `features/auth/` porque el interceptor de
 * `shared/api/http.ts` necesita el access token, y las reglas de
 * fronteras prohíben que `shared` importe de una feature.
 *
 * El flujo real de INNLAB (confirmado contra la guía de Core) es:
 *
 *   app sin sesión → {CORE_URL}/auth/sso?redirect=<nuestra url de callback>
 *     → el Hub autentica contra Cognito si hace falta
 *     → vuelve a nuestra app con ?code=xxxx  (un solo uso, TTL 30s)
 *     → GET {CORE_API_URL}/auth/sso/exchange?code=xxxx
 *     → { token: <id_token>, accessToken: <access_token> }
 *
 * `token` es el id_token y NO autentica: Core exige `token_use === 'access'`
 * y devuelve 401 si se usa el id_token. Guardamos ambos porque el contrato
 * los entrega juntos, pero el Bearer siempre es `accessToken`.
 *
 * No hay refresh token. La sesión se mantiene viva por sondeo pasivo
 * (`useSessionLiveness`), no por renovación.
 */
const STORAGE_KEY = 'innlab.session.v1';

/** Ruta a la que volver una vez completado el intercambio del código. */
const RETURN_TO_KEY = 'innlab.session.return-to';

export interface CoreSession {
  /** id_token. Identifica al usuario; no sirve para autenticar. */
  readonly token: string;
  /** access_token. El único válido como Bearer. */
  readonly accessToken: string;
}

function coreUrl(): string {
  return String(import.meta.env.VITE_CORE_URL ?? '');
}

/** URL a la que el Hub debe devolver el `?code=`. */
export function ssoCallbackUrl(): string {
  return `${window.location.origin}/auth/callback`;
}

export function readSession(): CoreSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;

    const parsed = JSON.parse(raw) as Partial<CoreSession>;
    if (typeof parsed.accessToken !== 'string' || parsed.accessToken === '') {
      return null;
    }

    return { token: String(parsed.token ?? ''), accessToken: parsed.accessToken };
  } catch {
    // localStorage bloqueado o JSON corrupto: sin sesión utilizable.
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
 * Guarda a dónde quería ir el usuario antes de que lo mandáramos al Hub.
 *
 * No viaja como query param: Core añade `?code=` a la URL de redirect y
 * no queremos depender de cómo compone la query string. `sessionStorage`
 * muere con la pestaña, que es exactamente la vida útil que necesita.
 */
export function rememberReturnTo(path: string): void {
  try {
    window.sessionStorage.setItem(RETURN_TO_KEY, path);
  } catch {
    // Sin sessionStorage se pierde el deep link, no la sesión.
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
 * Envía al usuario al Hub de INNLAB para autenticarse.
 *
 * Asignación directa a `window.location` — es una salida del SPA, no una
 * navegación del router: la vuelta la hace el Hub sobre `/auth/callback`.
 */
export function redirectToSso(returnTo?: string): void {
  // La ruta del Hub es `/auth/sso`, NO `/sso`: su router no tiene esa
  // segunda y el usuario cae en una pantalla en blanco con
  // "No routes matched location" en consola, sin error de red que lo
  // delate. El Hub hace `new URL(redirect)`, asi que debe ser absoluta.
  if (returnTo !== undefined && returnTo !== '') {
    rememberReturnTo(returnTo);
  }

  const redirect = encodeURIComponent(ssoCallbackUrl());
  window.location.href = `${coreUrl()}/auth/sso?redirect=${redirect}`;
}
