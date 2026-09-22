import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserContextGate } from '../UserContextGate';

const useCurrentUser = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/useCurrentUser', () => ({ useCurrentUser }));

function renderGate() {
  render(
    <UserContextGate>
      <button type="button">Iniciar diagnóstico</button>
    </UserContextGate>,
  );
}

describe('UserContextGate', () => {
  it('permite iniciar el diagnóstico cuando el contexto está disponible', () => {
    useCurrentUser.mockReturnValue({ isPending: false, isError: false, isFetching: false });

    renderGate();

    expect(screen.getByRole('button', { name: 'Iniciar diagnóstico' })).toBeInTheDocument();
  });

  it('informa que el servicio no está disponible y retira la acción', () => {
    useCurrentUser.mockReturnValue({
      isPending: false,
      isError: true,
      isFetching: false,
      refetch: vi.fn(),
    });

    renderGate();

    // Escenario "contexto de usuario no disponible": el diagnóstico se
    // asocia a quien lo inicia, así que no puede arrancarse a ciegas.
    expect(screen.getByRole('alert')).toHaveTextContent(/no está disponible temporalmente/i);
    expect(
      screen.queryByRole('button', { name: 'Iniciar diagnóstico' }),
    ).not.toBeInTheDocument();
  });

  it('permite reintentar la obtención del contexto', async () => {
    const refetch = vi.fn();
    useCurrentUser.mockReturnValue({
      isPending: false,
      isError: true,
      isFetching: false,
      refetch,
    });

    renderGate();
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('oculta la acción mientras carga, pero sin mostrar error', () => {
    useCurrentUser.mockReturnValue({ isPending: true, isError: false, isFetching: true });

    renderGate();

    expect(
      screen.queryByRole('button', { name: 'Iniciar diagnóstico' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/comprobando tu sesión/i);
  });
});
