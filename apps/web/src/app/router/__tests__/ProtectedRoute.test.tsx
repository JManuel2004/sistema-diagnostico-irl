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
const fetchAuthMode = vi.hoisted(() => vi.fn());
const enterAsParticipant = vi.hoisted(() => vi.fn());
vi.mock('@features/auth', () => ({ useSessionLiveness: () => undefined }));
vi.mock('@features/auth/api/auth-mode.api', () => ({
  fetchAuthMode,
  enterAsParticipant,
}));

vi.mock('@/shared/auth/session', async (importOriginal) => {
  const actual = await importOriginal<typeof SessionModule>();
  return { ...actual, redirectToSso };
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    window.localStorage.clear();
    redirectToSso.mockReset();
    fetchAuthMode.mockReset();
    enterAsParticipant.mockReset();
    fetchAuthMode.mockResolvedValue({ bypass: false, participants: [] });
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

  it('muestra las cinco personas y entra con la elegida, sin ir al Hub', async () => {
    fetchAuthMode.mockResolvedValue({
      bypass: true,
      participants: [
        {
          id: 'b1a55e55-0000-4000-8000-000000000001',
          firstName: 'Laura',
          lastName: 'Gómez',
          email: 'lider.agro@demo.innlab.local',
          companyName: 'AgroConecta (demo)',
        },
      ],
    });
    enterAsParticipant.mockImplementation(() => {
      saveSession({ token: '', accessToken: 'bypass-token' });
      return Promise.resolve(true);
    });

    renderGuarded();

    await userEvent.click(await screen.findByRole('button', { name: /Laura Gómez/ }));

    expect(await screen.findByText('contenido protegido')).toBeInTheDocument();
    expect(enterAsParticipant).toHaveBeenCalledWith(
      'b1a55e55-0000-4000-8000-000000000001',
    );
    expect(redirectToSso).not.toHaveBeenCalled();
  });
});
