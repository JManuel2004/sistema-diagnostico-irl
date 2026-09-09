import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { nanoid } from 'nanoid';
import { problemDetailsSchema, type ProblemDetails } from '@innlab/contracts';
import { clearSession, getAccessToken, redirectToSso } from '@/shared/auth/session';

export const http = axios.create({
  baseURL: String(import.meta.env.VITE_API_BASE_URL ?? '/api/v1'),
  timeout: 30_000,
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers.set('X-Correlation-Id', nanoid());

  // `accessToken`, nunca `token`: el id_token no autentica (el guard del
  // backend exige `token_use === 'access'`). Ver shared/auth/session.ts.
  const accessToken = getAccessToken();
  if (accessToken !== null) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return config;
});

/**
 * Error de API que conserva el documento RFC 7807 del backend.
 *
 * El interceptor anterior rechazaba con `new Error(error.message)` en
 * cuanto el cuerpo era un objeto —el caso normal—, así que el `code`
 * estable que el backend garantiza no llegaba nunca al componente. Sin él
 * la UI no puede distinguir "todavía no se ha generado" de "no hay
 * configuración vigente" de "el diagnóstico no tiene perfil", que son
 * tres situaciones con mensajes y acciones distintas.
 *
 * Como efecto secundario, exponer `status` reactiva la política de
 * reintentos de `query-client.ts`, que comprueba `error.status` y hasta
 * ahora no lo encontraba nunca: los 4xx se reintentaban igual que los 5xx.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string | undefined,
    readonly status: number | undefined,
    readonly detail?: string,
    readonly correlationId?: string,
    readonly problem?: ProblemDetails,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** True si el error trae un `code` concreto del backend. */
export function isApiErrorWithCode(error: unknown, code: string): boolean {
  return error instanceof ApiError && error.code === code;
}

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<unknown>) => {
    const status = error.response?.status;
    const data = error.response?.data;

    // Sin refresh token: un 401 significa sesión muerta, y la única
    // recuperación posible es rehacer el SSO desde cero. Va antes de
    // interpretar el cuerpo porque la acción no depende de su forma.
    if (status === 401) {
      clearSession();
      redirectToSso(window.location.pathname + window.location.search);
      return Promise.reject(
        new ApiError('Sesión expirada. Redirigiendo al inicio de sesión.', undefined, status),
      );
    }

    const parsed = problemDetailsSchema.safeParse(data);
    if (parsed.success) {
      const p = parsed.data;
      return Promise.reject(
        new ApiError(p.detail ?? p.title, p.code, p.status, p.detail, p.correlationId, p),
      );
    }

    // Respuestas que no siguen el contrato: un proxy, un timeout, un fallo
    // de red. Se conserva el status cuando lo hay para que la política de
    // reintentos siga funcionando.
    if (typeof data === 'string' && data.length > 0) {
      return Promise.reject(new ApiError(data, undefined, status));
    }

    return Promise.reject(new ApiError(error.message, undefined, status));
  },
);
