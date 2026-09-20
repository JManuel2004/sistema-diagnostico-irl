import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AppRoutes } from '../routes';

// The pages are not under test here, only where each route leads and who can open it.
vi.mock('@pages/LandingPage', () => ({ default: () => <p>LANDING_PAGE</p> }));
vi.mock('@pages/StartDiagnosticPage', () => ({ default: () => <p>INICIO_PAGE</p> }));
vi.mock('@pages/DiagnosticWizardPage', () => ({ default: () => <p>ASISTENTE_PAGE</p> }));
vi.mock('@pages/ResultsPage', () => ({ default: () => <p>RESULTADOS_PAGE</p> }));
vi.mock('@pages/DashboardPage', () => ({ default: () => <p>PANEL_PAGE</p> }));
vi.mock('@pages/InitiativePage', () => ({ default: () => <p>INICIATIVA_PAGE</p> }));

const session = vi.hoisted(() => ({ active: true, redirectToSso: vi.fn() }));
vi.mock('@/shared/auth/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/auth/session')>()),
  hasStoredSession: () => session.active,
  redirectToSso: session.redirectToSso,
}));
vi.mock('@features/auth', () => ({
  useSessionLiveness: () => undefined,
  LogoutButton: () => null,
}));

const ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function Where(): React.JSX.Element {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

function open(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
      <Where />
    </MemoryRouter>,
  );
}

describe('AppRoutes — el flujo de diagnóstico', () => {
  beforeEach(() => {
    session.active = true;
    session.redirectToSso.mockReset();
    window.history.pushState({}, '', '/');
  });

  describe('portada', () => {
    it('la portada es «/», y es pública', () => {
      session.active = false;

      open('/');

      expect(screen.getByText('LANDING_PAGE')).toBeInTheDocument();
      expect(session.redirectToSso).not.toHaveBeenCalled();
    });

    it('la ruta anterior /diagnosticos lleva a la portada', () => {
      open('/diagnosticos');

      expect(screen.getByText('LANDING_PAGE')).toBeInTheDocument();
      expect(screen.getByTestId('where')).toHaveTextContent('/');
    });
  });

  describe('inicio de sesión al iniciar un diagnóstico', () => {
    it('con sesión, /diagnosticos/nuevo abre la pantalla que arranca el diagnóstico', () => {
      open('/diagnosticos/nuevo');

      expect(screen.getByText('INICIO_PAGE')).toBeInTheDocument();
      expect(session.redirectToSso).not.toHaveBeenCalled();
    });

    it('sin sesión manda al inicio de sesión recordando /diagnosticos/nuevo para continuar al volver', () => {
      session.active = false;
      // `ProtectedRoute` recuerda la ruta de `window.location`, no la del router.
      window.history.pushState({}, '', '/diagnosticos/nuevo');

      open('/diagnosticos/nuevo');

      expect(screen.queryByText('INICIO_PAGE')).not.toBeInTheDocument();
      expect(session.redirectToSso).toHaveBeenCalledTimes(1);
      expect(session.redirectToSso).toHaveBeenCalledWith(expect.stringContaining('/diagnosticos/nuevo'));
    });
  });

  describe('asistente', () => {
    it.each(['', '/iniciativa', '/consentimiento', '/cuestionario', '/resumen'])(
      'tiene la ruta /asistente%s',
      (tail) => {
        open(`/diagnosticos/${ID}/asistente${tail}`);

        expect(screen.getByText('ASISTENTE_PAGE')).toBeInTheDocument();
      },
    );

    it('exige sesión', () => {
      session.active = false;

      open(`/diagnosticos/${ID}/asistente/cuestionario`);

      expect(screen.queryByText('ASISTENTE_PAGE')).not.toBeInTheDocument();
      expect(session.redirectToSso).toHaveBeenCalled();
    });

    it.each(['consentimiento', 'cuestionario'])(
      'la ruta anterior /%s lleva al paso del asistente',
      (old) => {
        open(`/diagnosticos/${ID}/${old}`);

        expect(screen.getByText('ASISTENTE_PAGE')).toBeInTheDocument();
        expect(screen.getByTestId('where')).toHaveTextContent(
          `/diagnosticos/${ID}/asistente/${old}`,
        );
      },
    );
  });

  describe('resultados y panel', () => {
    it('hay una sola página de resultados por diagnóstico', () => {
      open(`/diagnosticos/${ID}/resultados`);

      expect(screen.getByText('RESULTADOS_PAGE')).toBeInTheDocument();
    });

    it.each(['perfil', 'recomendacion', 'roadmap'])(
      'la ruta anterior /%s lleva a los resultados, para que un enlace guardado no se rompa',
      (old) => {
        open(`/diagnosticos/${ID}/${old}`);

        expect(screen.getByText('RESULTADOS_PAGE')).toBeInTheDocument();
        expect(screen.getByTestId('where')).toHaveTextContent(`/diagnosticos/${ID}/resultados`);
      },
    );

    it('el panel está en /panel', () => {
      open('/panel');

      expect(screen.getByText('PANEL_PAGE')).toBeInTheDocument();
    });

    it('la corrección de la iniciativa sigue en /iniciativa', () => {
      open(`/diagnosticos/${ID}/iniciativa`);

      expect(screen.getByText('INICIATIVA_PAGE')).toBeInTheDocument();
    });

    it.each(['/panel', '/diagnosticos/x/resultados', '/diagnosticos/x/iniciativa'])(
      '%s exige sesión',
      (path) => {
        session.active = false;

        open(path);

        expect(session.redirectToSso).toHaveBeenCalled();
      },
    );
  });
});
