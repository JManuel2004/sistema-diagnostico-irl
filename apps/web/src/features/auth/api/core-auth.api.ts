import axios from 'axios';
import { coreSessionSchema, type CoreSession } from '@innlab/contracts';

/**
 * Client for the INNLAB Core API (`innlab-core-api`).
 *
 * Its own instance, separate from `shared/api/http`: it points at another
 * host (Core, not our backend) and must not carry the 401 interceptor,
 * which would trigger a redirect loop exactly while the session is being
 * established.
 *
 * The code exchange is done by the FRONTEND directly against Core. Our
 * backend never sees the `code`.
 */
const coreApi = axios.create({
  baseURL: String(import.meta.env.VITE_CORE_API_URL ?? ''),
  timeout: 15_000,
});

/**
 * Exchanges the SSO `?code=` for the session tokens.
 *
 * The code is single use and expires after 30 seconds: if this call fails
 * it cannot be retried with the same code; the whole flow has to be redone
 * from the Hub.
 */
export async function exchangeSsoCode(code: string): Promise<CoreSession> {
  let data: unknown;

  try {
    ({ data } = await coreApi.get<unknown>('/auth/sso/exchange', {
      params: { code },
    }));
  } catch (cause) {
    // axios's raw message ("Request failed with status code 404") ends up
    // printed on the screen the user sees, and says nothing actionable.
    // The cases Core really distinguishes are translated.
    if (axios.isAxiosError(cause)) {
      if (cause.response === undefined) {
        throw new Error(
          'No pudimos contactar con INNLAB. Revisa tu conexión e inténtalo de nuevo.',
        );
      }
      if (cause.response.status === 404) {
        throw new Error(
          'El enlace de acceso ya se usó o caducó (son válidos 30 segundos). Inicia sesión de nuevo.',
        );
      }
      throw new Error(
        `INNLAB rechazó el inicio de sesión (error ${String(cause.response.status)}).`,
      );
    }
    throw cause;
  }

  // The response comes from an external service: it is validated against
  // the contract instead of trusting a TypeScript generic.
  const session = coreSessionSchema.safeParse(data);
  if (!session.success) {
    throw new Error(
      'Core devolvió una respuesta de intercambio sin accessToken o con un formato inválido.',
    );
  }

  return session.data;
}

/**
 * Asks Core whether the access token is still alive.
 *
 * `false` means the session ended (401), not a network error: an
 * unreachable Core must not kick out a user whose session is still valid,
 * so that case resolves to `true` and is retried on the next tab focus.
 */
export async function isSessionAlive(accessToken: string): Promise<boolean> {
  try {
    await coreApi.get('/auth/introspect', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return true;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return false;
    }
    return true;
  }
}

/**
 * Ends the session across the whole ecosystem.
 *
 * Core invalidates it in Cognito (`GlobalSignOut`) and revokes it on its
 * side, so this is not a local logout: it affects every INNLAB product.
 */
export async function logoutFromCore(accessToken: string): Promise<void> {
  await coreApi.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${accessToken}` } });
}
