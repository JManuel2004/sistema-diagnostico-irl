import axios from 'axios';
import { coreSessionSchema, type CoreSession } from '@innlab/contracts';
import { ApiError, http } from '@/shared/api/http';

/**
 * Client for the INNLAB Core API (`innlab-core-api`).
 *
 * Introspection and logout still go straight to Core. The code exchange
 * does not: Core refuses the deployed site's origin, so the SPA asks our
 * API and the API calls Core from the server.
 *
 * This instance stays free of the 401 interceptor. The exchange uses
 * `http` but treats every failure itself, before a dead session could
 * send the callback screen back to the Hub.
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
    ({ data } = await http.get<unknown>('/auth/sso/exchange', {
      params: { code },
    }));
  } catch (cause) {
    // The raw axios message ends up on the screen and says nothing
    // actionable. The cases Core really distinguishes are translated.
    if (cause instanceof ApiError) {
      if (cause.status === undefined || cause.status === 502 || cause.status === 503) {
        throw new Error(
          'No pudimos contactar con INNLAB. Revisa tu conexión e inténtalo de nuevo.',
        );
      }
      if (cause.status === 404) {
        throw new Error(
          'El enlace de acceso ya se usó o caducó (son válidos 30 segundos). Inicia sesión de nuevo.',
        );
      }
      throw new Error(
        `INNLAB rechazó el inicio de sesión (error ${String(cause.status)}).`,
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
