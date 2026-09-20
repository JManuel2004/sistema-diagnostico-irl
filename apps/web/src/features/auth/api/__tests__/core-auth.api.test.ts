import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { exchangeSsoCode, isSessionAlive, logoutFromCore } from '../core-auth.api';

// Fijado en `.env.test`, que tiene prioridad sobre `.env.local`. Sin ese
// archivo los tests heredarian la URL real de Core de la maquina de quien
// los corra y saldrian a internet.
const CORE = 'https://core-api.test';

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

  it.each([
    ['un accessToken que no es texto', { token: 'id', accessToken: 42 }],
    ['un accessToken vacío', { token: 'id', accessToken: '' }],
    ['un cuerpo que no es un objeto', 'ok'],
    ['un cuerpo nulo', null],
  ])('rechaza una respuesta con %s en vez de fiarse del tipo', async (_caso, cuerpo) => {
    server.use(http.get(`${CORE}/auth/sso/exchange`, () => HttpResponse.json(cuerpo)));

    await expect(exchangeSsoCode('code-123')).rejects.toThrow(/sin accessToken|inválido/);
  });

  it('acepta una respuesta sin id_token y devuelve solo los campos del contrato', async () => {
    server.use(
      http.get(`${CORE}/auth/sso/exchange`, () =>
        HttpResponse.json({ accessToken: 'access-token', extra: 'ignorado' }),
      ),
    );

    await expect(exchangeSsoCode('code-123')).resolves.toEqual({
      token: '',
      accessToken: 'access-token',
    });
  });

  it('explica en claro que el código ya se usó o caducó', async () => {
    server.use(
      http.get(`${CORE}/auth/sso/exchange`, () => new HttpResponse(null, { status: 404 })),
    );

    // Este texto acaba en pantalla: no puede ser el "Request failed with
    // status code 404" que devuelve axios por defecto.
    await expect(exchangeSsoCode('code-vencido')).rejects.toThrow(/ya se usó o caducó/);
  });

  it('distingue un fallo de red de un rechazo de Core', async () => {
    server.use(http.get(`${CORE}/auth/sso/exchange`, () => HttpResponse.error()));

    await expect(exchangeSsoCode('code-123')).rejects.toThrow(/No pudimos contactar/);
  });

  it('reporta el status cuando Core rechaza por otra razón', async () => {
    server.use(
      http.get(`${CORE}/auth/sso/exchange`, () => new HttpResponse(null, { status: 500 })),
    );

    await expect(exchangeSsoCode('code-123')).rejects.toThrow(/error 500/);
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
