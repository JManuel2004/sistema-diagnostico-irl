import axios from 'axios';
import { coreSessionSchema, type CoreSession } from '@innlab/contracts';

/**
 * Cliente hacia la API de INNLAB Core (`innlab-core-api`).
 *
 * Instancia propia y separada de `shared/api/http`: apunta a otro host
 * (Core, no nuestro backend) y no debe arrastrar el interceptor de 401,
 * que dispararía un bucle de redirects justo cuando estamos intentando
 * establecer la sesión.
 *
 * El intercambio del código lo hace el FRONTEND directo contra Core.
 * Nuestro backend nunca ve el `code`.
 */
const coreApi = axios.create({
  baseURL: String(import.meta.env.VITE_CORE_API_URL ?? ''),
  timeout: 15_000,
});

/**
 * Canjea el `?code=` del SSO por los tokens de la sesión.
 *
 * El código es de un solo uso y expira a los 30 segundos: si esta llamada
 * falla no se puede reintentar con el mismo código, hay que rehacer el
 * flujo completo desde el Hub.
 */
export async function exchangeSsoCode(code: string): Promise<CoreSession> {
  let data: unknown;

  try {
    ({ data } = await coreApi.get<unknown>('/auth/sso/exchange', {
      params: { code },
    }));
  } catch (cause) {
    // El mensaje crudo de axios ("Request failed with status code 404") acaba
    // impreso en la pantalla que ve el usuario, y no dice nada accionable.
    // Traducimos los casos que Core distingue de verdad.
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

  // La respuesta viene de un servicio externo: se valida contra el contrato
  // en vez de confiar en un genérico de TypeScript.
  const session = coreSessionSchema.safeParse(data);
  if (!session.success) {
    throw new Error(
      'Core devolvió una respuesta de intercambio sin accessToken o con un formato inválido.',
    );
  }

  return session.data;
}

/**
 * Pregunta a Core si el access token sigue vivo.
 *
 * `false` significa sesión terminada (401), no error de red: un Core
 * inalcanzable no debe expulsar a un usuario cuya sesión sigue siendo
 * válida, así que ese caso se resuelve como `true` y se reintenta en el
 * siguiente foco de la pestaña.
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
 * Cierra la sesión en todo el ecosistema.
 *
 * Core invalida en Cognito (`GlobalSignOut`) y revoca de su lado, así que
 * esto no es un logout local: afecta a todos los productos INNLAB.
 */
export async function logoutFromCore(accessToken: string): Promise<void> {
  await coreApi.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${accessToken}` } });
}
