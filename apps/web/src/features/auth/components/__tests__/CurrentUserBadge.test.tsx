import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CurrentUserBadge } from '../CurrentUserBadge';

const useCurrentUser = vi.hoisted(() => vi.fn());
vi.mock('../../hooks/useCurrentUser', () => ({ useCurrentUser }));

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

describe('CurrentUserBadge', () => {
  it('muestra el nombre y el correo del usuario reconocido', () => {
    useCurrentUser.mockReturnValue({ isSuccess: true, data: DATA });

    render(<CurrentUserBadge />);

    expect(screen.getByText('Sebastian Marin')).toBeInTheDocument();
    expect(screen.getByText(/sebastian17\.se@gmail\.com/)).toBeInTheDocument();
  });

  it('acompaña el correo con la empresa activa', () => {
    useCurrentUser.mockReturnValue({ isSuccess: true, data: DATA });

    render(<CurrentUserBadge />);

    expect(screen.getByText(/· Icesi$/)).toBeInTheDocument();
  });

  it('cae al correo cuando el nombre viene vacío', () => {
    useCurrentUser.mockReturnValue({
      isSuccess: true,
      data: { ...DATA, user: { ...DATA.user, firstName: '', lastName: '' } },
    });

    render(<CurrentUserBadge />);

    expect(screen.getAllByText(/sebastian17\.se@gmail\.com/).length).toBeGreaterThan(0);
  });

  it('no renderiza nada mientras el contexto no esté disponible', () => {
    useCurrentUser.mockReturnValue({ isSuccess: false, data: undefined });

    const { container } = render(<CurrentUserBadge />);

    expect(container).toBeEmptyDOMElement();
  });
});
