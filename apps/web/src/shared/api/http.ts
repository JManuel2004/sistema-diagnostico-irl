import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { nanoid } from 'nanoid';

export const http = axios.create({
  baseURL: String(import.meta.env.VITE_API_BASE_URL ?? '/api/v1'),
  timeout: 30_000,
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers.set('X-Correlation-Id', nanoid());
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<unknown>) => {
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
