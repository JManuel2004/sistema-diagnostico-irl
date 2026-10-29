import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { saveSession } from '@/shared/auth/session';
import type * as SessionModule from '@/shared/auth/session';

/**
 * `PageShell` (the "redirecting" screen) contains a `Link`, so the tree
 * needs a router context. `ProtectedRoute` reads the route from
 * `window.location`, not from the router, so `pushState` is still what
 * decides the remembered deep link.
 */
function renderGuarded(): void {
  render(
    <MemoryRouter>
      <ProtectedRoute>
        <p>contenido protegido</p>
      </ProtectedRoute>
    </MemoryRouter>,
  );
}

const redirectToSso = vi.hoisted(() => vi.fn());
const fetchAuthBypass = vi.hoisted(() => vi.fn());
const enterWithCredentials = vi.hoisted(() => vi.fn());
vi.mock('@features/auth', () => ({ useSessionLiveness: () => undefined }));
vi.mock('@features/auth/api/auth-mode.api', () => ({
  fetchAuthBypass,
  enterWithCredentials,
}));

vi.mock('@/shared/auth/session', async (importOriginal) => {
  const actual = await importOriginal<typeof SessionModule>();
  return { ...actual, redirectToSso };
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    window.localStorage.clear();
    redirectToSso.mockReset();
    fetchAuthBypass.mockReset();
    enterWithCredentials.mockReset();
    fetchAuthBypass.mockResolvedValue(false);
  });

  it('renderiza la pantalla protegida cuando hay sesión', () => {
    saveSession({ token: 'id-token', accessToken: 'access-token' });

    renderGuarded();

    expect(screen.getByText('contenido protegido')).toBeInTheDocument();
    expect(redirectToSso).not.toHaveBeenCalled();
  });

  it('manda al Hub y oculta el contenido cuando no hay sesión', async () => {
    renderGuarded();

    expect(screen.queryByText('contenido protegido')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(redirectToSso).toHaveBeenCalled();
    });
  });

  it('conserva la ruta pedida para volver después del login', async () => {
    window.history.pushState({}, '', '/diagnosticos/42/cuestionario');

    renderGuarded();

    await waitFor(() => {
      expect(redirectToSso).toHaveBeenCalledWith('/diagnosticos/42/cuestionario');
    });
  });

  it('entra con correo y contraseña y no va al Hub', async () => {
    fetchAuthBypass.mockResolvedValue(true);
    enterWithCredentials.mockImplementation(() => {
      saveSession({ token: '', accessToken: 'bypass-token' });
      return Promise.resolve('ok');
    });

    renderGuarded();

    await userEvent.type(
      await screen.findByLabelText('Correo'),
      'lider.agro@demo.innlab.local',
    );
    await userEvent.type(screen.getByLabelText('Contraseña'), 'Agro-2026');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('contenido protegido')).toBeInTheDocument();
    expect(enterWithCredentials).toHaveBeenCalledWith(
      'lider.agro@demo.innlab.local',
      'Agro-2026',
    );
    expect(redirectToSso).not.toHaveBeenCalled();
  });

  it('se queda en el formulario si las credenciales no sirven', async () => {
    fetchAuthBypass.mockResolvedValue(true);
    enterWithCredentials.mockResolvedValue('invalid');

    renderGuarded();

    await userEvent.type(await screen.findByLabelText('Correo'), 'lider.agro@demo.innlab.local');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mala');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Correo o contraseña incorrectos.',
    );
    expect(screen.queryByText('contenido protegido')).not.toBeInTheDocument();
    expect(redirectToSso).not.toHaveBeenCalled();
  });
});
