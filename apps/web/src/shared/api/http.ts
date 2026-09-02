import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { nanoid } from 'nanoid';
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

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<unknown>) => {
    // Sin refresh token: un 401 significa sesión muerta, y la única
    // recuperación posible es rehacer el SSO desde cero.
    if (error.response?.status === 401) {
      clearSession();
      redirectToSso(window.location.pathname + window.location.search);
      return Promise.reject(new Error('Sesión expirada. Redirigiendo al inicio de sesión.'));
    }

    const responseData = error.response?.data;

    if (typeof responseData === 'string') {
      return Promise.reject(new Error(responseData));
    }

    if (responseData instanceof Error) {
      return Promise.reject(responseData);
    }

    return Promise.reject(new Error(error.message));
  },
);
