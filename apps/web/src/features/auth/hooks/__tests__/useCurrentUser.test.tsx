import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCurrentUser } from '../useCurrentUser';
import { saveSession } from '@/shared/auth/session';

const API = 'http://localhost:3000/api/v1';

/** Respuesta real capturada del backend, no una inventada. */
const CONTEXT = {
  user: {
    id: 'e17bc500-30f1-7037-ff18-f860e2b77806',
    email: 'sebastian17.se@gmail.com',
    firstName: 'Sebastian',
    lastName: 'Marin',
  },
  core: {
    companyId: '679d055d-57f4-405b-bad8-b1fbc1118e3a',
    companyRole: 'owner',
    workspaceId: null,
    companies: [{ id: '679d055d-57f4-405b-bad8-b1fbc1118e3a', name: 'Icesi', role: 'owner' }],
  },
};

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useCurrentUser', () => {
  beforeEach(() => {
    window.localStorage.clear();
    saveSession({ token: 'id-token', accessToken: 'access-token' });
  });

  it('obtiene nombre, correo e identificador del usuario autenticado', async () => {
    server.use(http.get(`${API}/me/context`, () => HttpResponse.json(CONTEXT)));

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.user).toEqual({
      id: 'e17bc500-30f1-7037-ff18-f860e2b77806',
      email: 'sebastian17.se@gmail.com',
      firstName: 'Sebastian',
      lastName: 'Marin',
    });
  });

  it('expone la empresa a la que pertenece', async () => {
    server.use(http.get(`${API}/me/context`, () => HttpResponse.json(CONTEXT)));

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.core.companyId).toBe('679d055d-57f4-405b-bad8-b1fbc1118e3a');
    expect(result.current.data?.core.companies).toHaveLength(1);
  });

  it('acepta un usuario que todavia no pertenece a ninguna empresa', async () => {
    server.use(
      http.get(`${API}/me/context`, () =>
        HttpResponse.json({
          ...CONTEXT,
          core: { companyId: null, companyRole: null, workspaceId: null, companies: [] },
        }),
      ),
    );

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.core.companyId).toBeNull();
  });

  it('queda en error cuando Core no responde, sin reintentar', async () => {
    let calls = 0;
    server.use(
      http.get(`${API}/me/context`, () => {
        calls += 1;
        return new HttpResponse(null, { status: 503 });
      }),
    );

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // Un reintento automatico solo alargaria la espera del usuario ante una
    // caida de Core; la recuperacion es manual desde UserContextGate.
    expect(calls).toBe(1);
  });

  it('no consulta nada si no hay sesion guardada', () => {
    window.localStorage.clear();

    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    expect(result.current.fetchStatus).toBe('idle');
  });
});
