import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { exchangeSsoCode, isSessionAlive, logoutFromCore } from '../core-auth.api';

// Debe coincidir con VITE_CORE_API_URL en el entorno de test (vacío ⇒
// axios resuelve contra el origen de jsdom).
const CORE = 'http://localhost';

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

describe('exchangeSsoCode', () => {
  it('canjea el código por ambos tokens', async () => {
    server.use(
      http.get(`${CORE}/auth/sso/exchange`, ({ request }) => {
        expect(new URL(request.url).searchParams.get('code')).toBe('code-123');
        return HttpResponse.json({ token: 'id-token', accessToken: 'access-token' });
      }),
    );

    await expect(exchangeSsoCode('code-123')).resolves.toEqual({
      token: 'id-token',
      accessToken: 'access-token',
    });
  });

  it('rechaza una respuesta sin accessToken', async () => {
    server.use(
      http.get(`${CORE}/auth/sso/exchange`, () => HttpResponse.json({ token: 'solo-id' })),
    );

    await expect(exchangeSsoCode('code-123')).rejects.toThrow('sin accessToken');
  });

  it('propaga el fallo de un código ya expirado', async () => {
    server.use(
      http.get(`${CORE}/auth/sso/exchange`, () => new HttpResponse(null, { status: 400 })),
    );

    await expect(exchangeSsoCode('code-vencido')).rejects.toThrow();
  });
});

describe('isSessionAlive', () => {
  it('manda el accessToken como Bearer y acepta la sesión viva', async () => {
    server.use(
      http.get(`${CORE}/auth/introspect`, ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer access-token');
        return HttpResponse.json({ active: true });
      }),
    );

    await expect(isSessionAlive('access-token')).resolves.toBe(true);
  });

  it('da la sesión por muerta solo ante un 401', async () => {
    server.use(
      http.get(`${CORE}/auth/introspect`, () => new HttpResponse(null, { status: 401 })),
    );

    await expect(isSessionAlive('access-token')).resolves.toBe(false);
  });

  it('no expulsa al usuario cuando Core falla por otra razón', async () => {
    server.use(
      http.get(`${CORE}/auth/introspect`, () => new HttpResponse(null, { status: 503 })),
    );

    // Un Core caído no es una sesión inválida: cerrar sesión aquí sacaría
    // a usuarios perfectamente autenticados durante una caída de Core.
    await expect(isSessionAlive('access-token')).resolves.toBe(true);
  });
});

describe('logoutFromCore', () => {
  it('cierra la sesión centralizada con el accessToken', async () => {
    server.use(
      http.post(`${CORE}/auth/logout`, ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer access-token');
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(logoutFromCore('access-token')).resolves.toBeUndefined();
  });
});
