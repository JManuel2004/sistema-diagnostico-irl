import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { saveSession } from '@/shared/auth/session';
import type * as SessionModule from '@/shared/auth/session';
import type { SimulatedUser } from '@features/auth/api/auth-mode.api';

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
const fetchSimulatedSignIn = vi.hoisted(() => vi.fn());
const enterAsSimulatedUser = vi.hoisted(() => vi.fn());
vi.mock('@features/auth', () => ({ useSessionLiveness: () => undefined }));
vi.mock('@features/auth/api/auth-mode.api', () => ({
  fetchSimulatedSignIn,
  enterAsSimulatedUser,
}));

vi.mock('@/shared/auth/session', async (importOriginal) => {
  const actual = await importOriginal<typeof SessionModule>();
  return { ...actual, redirectToSso };
});

const LAURA_ID = 'b1a55e55-0000-4000-8000-000000000001';
const CARDS: readonly SimulatedUser[] = [
  {
    id: LAURA_ID,
    firstName: 'Laura',
    lastName: 'Gómez',
    email: 'lider.agro@demo.innlab.local',
    companyName: 'AgroConecta (demo)',
  },
  {
    id: 'b1a55e55-0000-4000-8000-000000000003',
    firstName: 'Camila',
    lastName: 'Torres',
    email: 'sin.empresa@demo.innlab.local',
    companyName: null,
  },
];

describe('ProtectedRoute', () => {
  beforeEach(() => {
    window.localStorage.clear();
    redirectToSso.mockReset();
    fetchSimulatedSignIn.mockReset();
    enterAsSimulatedUser.mockReset();
    fetchSimulatedSignIn.mockResolvedValue(null);
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

  it('muestra el aviso y las tarjetas del simulador', async () => {
    fetchSimulatedSignIn.mockResolvedValue(CARDS);

    renderGuarded();

    expect(await screen.findByRole('note')).toHaveTextContent(
      'Modo simulado. Este inicio de sesión no usa INNLAB ni Cognito. Sirve solo para demostraciones y pruebas.',
    );
    expect(screen.getByRole('heading', { name: 'Elige un usuario de prueba' })).toBeInTheDocument();
    const laura = screen.getByRole('button', { name: /Laura Gómez/ });
    expect(laura).toHaveTextContent('lider.agro@demo.innlab.local');
    expect(laura).toHaveTextContent('AgroConecta (demo)');
    expect(screen.getByRole('button', { name: /Camila Torres/ })).toHaveTextContent(
      'Sin organización',
    );
    expect(redirectToSso).not.toHaveBeenCalled();
  });

  it('entra al pulsar una tarjeta y no va al Hub', async () => {
    fetchSimulatedSignIn.mockResolvedValue(CARDS);
    enterAsSimulatedUser.mockImplementation(() => {
      saveSession({ token: '', accessToken: 'bypass-token' });
      return Promise.resolve('ok');
    });

    renderGuarded();
    await userEvent.click(await screen.findByRole('button', { name: /Laura Gómez/ }));

    expect(await screen.findByText('contenido protegido')).toBeInTheDocument();
    expect(enterAsSimulatedUser).toHaveBeenCalledWith(LAURA_ID);
    expect(redirectToSso).not.toHaveBeenCalled();
  });

  it('se queda en las tarjetas si esa persona no abre sesión', async () => {
    fetchSimulatedSignIn.mockResolvedValue(CARDS);
    enterAsSimulatedUser.mockResolvedValue('invalid');

    renderGuarded();
    await userEvent.click(await screen.findByRole('button', { name: /Laura Gómez/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo abrir la sesión de esa persona.',
    );
    expect(screen.getByRole('heading', { name: 'Elige un usuario de prueba' })).toBeInTheDocument();
    expect(screen.queryByText('contenido protegido')).not.toBeInTheDocument();
    expect(redirectToSso).not.toHaveBeenCalled();
  });
});
