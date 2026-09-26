import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from '../UserMenu';

const useCurrentUser = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/useCurrentUser', () => ({ useCurrentUser }));

const logout = vi.hoisted(() => vi.fn());
const useLogout = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/useLogout', () => ({ useLogout }));

const DATA = {
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

describe('UserMenu', () => {
  beforeEach(() => {
    logout.mockReset();
    useLogout.mockReturnValue({ logout, isLoggingOut: false });
  });

  it('no renderiza nada mientras el contexto no esté disponible', () => {
    useCurrentUser.mockReturnValue({ isSuccess: false, data: undefined });

    const { container } = render(<UserMenu />);

    expect(container).toBeEmptyDOMElement();
  });

  it('muestra la inicial del nombre en el avatar y mantiene el detalle oculto hasta abrir', () => {
    useCurrentUser.mockReturnValue({ isSuccess: true, data: DATA });

    render(<UserMenu />);

    expect(screen.getByRole('button', { name: 'Cuenta' })).toHaveTextContent('S');
    expect(screen.queryByText('sebastian17.se@gmail.com')).not.toBeInTheDocument();
  });

  it('despliega nombre y correo al hacer click en el avatar', async () => {
    useCurrentUser.mockReturnValue({ isSuccess: true, data: DATA });

    render(<UserMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Cuenta' }));

    expect(screen.getByText('Sebastian Marin')).toBeInTheDocument();
    expect(screen.getByText('sebastian17.se@gmail.com')).toBeInTheDocument();
  });

  it('cae al correo cuando el nombre viene vacío', async () => {
    useCurrentUser.mockReturnValue({
      isSuccess: true,
      data: { ...DATA, user: { ...DATA.user, firstName: '', lastName: '' } },
    });

    render(<UserMenu />);

    expect(screen.getByRole('button', { name: 'Cuenta' })).toHaveTextContent('S');
    await userEvent.click(screen.getByRole('button', { name: 'Cuenta' }));
    expect(screen.getAllByText('sebastian17.se@gmail.com').length).toBeGreaterThan(0);
  });

  it('cierra la sesión al elegir "Cerrar sesión"', async () => {
    useCurrentUser.mockReturnValue({ isSuccess: true, data: DATA });

    render(<UserMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Cuenta' }));
    await userEvent.click(screen.getByText('Cerrar sesión'));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
