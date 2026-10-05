import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { nanoid } from 'nanoid';
import type { ZodType, ZodTypeDef } from 'zod';
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

/** True if the error is an API answer with that HTTP status. */
export function isApiErrorWithStatus(error: unknown, status: number): boolean {
  return error instanceof ApiError && error.status === status;
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

/**
 * GET a resource of our backend and validate it against its contract.
 * Every read goes through here, so a response that breaks the contract
 * fails at the edge instead of reaching a component.
 */
export async function getParsed<T>(
  url: string,
  schema: ZodType<T, ZodTypeDef, unknown>,
): Promise<T> {
  const { data } = await http.get<unknown>(url);
  return schema.parse(data);
}

/**
 * Like `getParsed`, for a resource that may not exist yet: a 404 is the
 * normal "not registered yet" answer and comes back as `null`.
 */
export async function getParsedOrNull<T>(
  url: string,
  schema: ZodType<T, ZodTypeDef, unknown>,
): Promise<T | null> {
  try {
    return await getParsed(url, schema);
  } catch (error) {
    if (isApiErrorWithStatus(error, 404)) return null;
    throw error;
  }
}

/** POST to our backend and validate the response against its contract. */
export async function postParsed<T>(
  url: string,
  body: unknown,
  schema: ZodType<T, ZodTypeDef, unknown>,
): Promise<T> {
  const { data } = await http.post<unknown>(url, body);
  return schema.parse(data);
}

/** A file served by our backend, with the name it suggests saving it under. */
export interface DownloadedFile {
  readonly blob: Blob;
  /** From `Content-Disposition`; `null` when the response does not say. */
  readonly fileName: string | null;
}

/**
 * GET a binary file of our backend (a report), with the session's token
 * like every other call: a plain link could not carry it. An error answer
 * arrives as a blob, not as the problem document, so it keeps its status
 * but not its `code`.
 */
export async function getFile(url: string): Promise<DownloadedFile> {
  const response = await http.get<Blob>(url, { responseType: 'blob' });
  const disposition: unknown = response.headers['content-disposition'];
  const match = typeof disposition === 'string' ? /filename="?([^";]+)"?/.exec(disposition) : null;
  return { blob: response.data, fileName: match?.[1] ?? null };
}
