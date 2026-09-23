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

  // `accessToken`, never `token`: the id_token does not authenticate (the
  // backend's guard requires `token_use === 'access'`). See shared/auth/session.ts.
  const accessToken = getAccessToken();
  if (accessToken !== null) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return config;
});

/**
 * API error that keeps the backend's RFC 7807 document.
 *
 * Keeping the whole document is what lets the UI see the stable `code`
 * the backend guarantees, and so tell "not generated yet" from "no live
 * configuration" from "the diagnostic has no profile", three situations
 * with different messages and actions.
 *
 * It also exposes `status`, which the retry policy of `query-client.ts`
 * checks: 4xx are not retried, 5xx are.
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

/** True if the error carries a specific `code` from the backend. */
export function isApiErrorWithCode(error: unknown, code: string): boolean {
  return error instanceof ApiError && error.code === code;
}

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<unknown>) => {
    const status = error.response?.status;
    const data = error.response?.data;

    // No refresh token: a 401 means a dead session, and the only possible
    // recovery is redoing the SSO from scratch. It comes before reading
    // the body because the action does not depend on its shape.
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

    // Responses that do not follow the contract: a proxy, a timeout, a
    // network failure. The status is kept when there is one so the retry
    // policy keeps working.
    if (typeof data === 'string' && data.length > 0) {
      return Promise.reject(new ApiError(data, undefined, status));
    }

    return Promise.reject(new ApiError(error.message, undefined, status));
  },
);
