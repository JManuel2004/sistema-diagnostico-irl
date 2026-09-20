import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import DashboardPage from '../DashboardPage';
import { renderWithClient } from '@/test/render-with-client';
import { initiativeFixture } from '@/test/fixtures/initiative';

const NEWEST = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const OLDER = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function diagnostic(id: string, state = 'PROFILE_GENERATED') {
  return {
    id,
    userId: 'user-1',
    state,
    completed: state === 'PROFILE_GENERATED',
    deepAnalysisAccepted: false,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  };
}

function renderPage() {
  return renderWithClient(
    <MemoryRouter initialEntries={['/panel']}>
      <Routes>
        <Route path="/panel" element={<DashboardPage />} />
        <Route path="/diagnosticos/:id/asistente" element={<div>ASISTENTE_STUB</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('DashboardPage — panel de iniciativa', () => {
  it('muestra la información de la iniciativa del diagnóstico más reciente con resultados', async () => {
    server.use(
      mswHttp.get('*/diagnostics', () =>
        HttpResponse.json([diagnostic(NEWEST), diagnostic(OLDER)]),
      ),
      mswHttp.get('*/diagnostics/:id/initiative', ({ params }) => {
        expect(params.id).toBe(NEWEST);
        return HttpResponse.json(initiativeFixture());
      }),
    );

    renderPage();

    expect(await screen.findByRole('heading', { name: 'AgroConecta' })).toBeInTheDocument();
    expect(screen.getByText('Agroindustria / AgriTech')).toBeInTheDocument();
    expect(screen.getByText(/Aplicación web y módulo de trazabilidad/)).toBeInTheDocument();
    expect(screen.getByText(/Validación — Piloto completado/)).toBeInTheDocument();
    expect(screen.getByText(/3 personas — Fundadora, coordinadora/)).toBeInTheDocument();
    expect(screen.getByText('Productores de café del suroccidente')).toBeInTheDocument();
    expect(screen.getByText('Ahorros de la fundadora')).toBeInTheDocument();
  });

  it('deja reservado el espacio del historial de diagnósticos, sin construirlo', async () => {
    server.use(
      mswHttp.get('*/diagnostics', () =>
        HttpResponse.json([diagnostic(NEWEST), diagnostic(OLDER)]),
      ),
      mswHttp.get('*/diagnostics/:id/initiative', () => HttpResponse.json(initiativeFixture())),
    );

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Historial de diagnósticos' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Próximamente/)).toBeInTheDocument();
    // The list of past diagnostics is a future story: the older one is not listed.
    expect(screen.queryByText(OLDER)).not.toBeInTheDocument();
  });

  it('ofrece editar la iniciativa y ver los resultados del diagnóstico, no el cuestionario', async () => {
    server.use(
      mswHttp.get('*/diagnostics', () => HttpResponse.json([diagnostic(NEWEST)])),
      mswHttp.get('*/diagnostics/:id/initiative', () => HttpResponse.json(initiativeFixture())),
    );

    renderPage();

    const access = await screen.findByRole('navigation', { name: 'Accesos del diagnóstico' });
    expect(access).toHaveTextContent('Editar iniciativa');
    expect(screen.getByRole('link', { name: 'Editar iniciativa' })).toHaveAttribute(
      'href',
      `/diagnosticos/${NEWEST}/iniciativa`,
    );
    // The questionnaire is a wizard step: once the diagnostic is processed there is no way back to it.
    expect(screen.queryByRole('link', { name: 'Ir al cuestionario' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver resultados' })).toHaveAttribute(
      'href',
      `/diagnosticos/${NEWEST}/resultados`,
    );
  });

  describe('un diagnóstico que sigue en el asistente', () => {
    it('ofrece continuarlo, sin mostrar sus resultados', async () => {
      server.use(
        mswHttp.get('*/diagnostics', () =>
          HttpResponse.json([diagnostic(NEWEST, 'WITH_INITIATIVE')]),
        ),
      );

      renderPage();

      expect(
        await screen.findByRole('heading', { name: 'Tienes un diagnóstico en curso' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Continuar diagnóstico' })).toHaveAttribute(
        'href',
        `/diagnosticos/${NEWEST}/asistente`,
      );
      expect(screen.queryByRole('link', { name: 'Ver resultados' })).not.toBeInTheDocument();
    });

    it('con uno anterior ya terminado, muestra la iniciativa de ese y ofrece continuar el otro', async () => {
      server.use(
        mswHttp.get('*/diagnostics', () =>
          HttpResponse.json([diagnostic(NEWEST, 'STARTED'), diagnostic(OLDER)]),
        ),
        mswHttp.get('*/diagnostics/:id/initiative', ({ params }) => {
          expect(params.id).toBe(OLDER);
          return HttpResponse.json(initiativeFixture());
        }),
      );

      renderPage();

      expect(await screen.findByRole('heading', { name: 'AgroConecta' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Continuar diagnóstico' })).toHaveAttribute(
        'href',
        `/diagnosticos/${NEWEST}/asistente`,
      );
      expect(screen.getByRole('link', { name: 'Ver resultados' })).toHaveAttribute(
        'href',
        `/diagnosticos/${OLDER}/resultados`,
      );
    });
  });

  it('sin ningún diagnóstico ofrece iniciar uno, y al crearlo abre el asistente', async () => {
    server.use(
      mswHttp.get('*/diagnostics', () => HttpResponse.json([])),
      mswHttp.post('*/diagnostics', () =>
        HttpResponse.json(diagnostic(NEWEST, 'STARTED'), { status: 201 }),
      ),
    );
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Iniciar diagnóstico' }));

    expect(await screen.findByText('ASISTENTE_STUB')).toBeInTheDocument();
  });

  describe('navegación', () => {
    it('lleva la navegación principal y el descriptor institucional lleva al panel', async () => {
      server.use(mswHttp.get('*/diagnostics', () => HttpResponse.json([diagnostic(NEWEST)])));
      server.use(
        mswHttp.get('*/diagnostics/:id/initiative', () => HttpResponse.json(initiativeFixture())),
      );

      renderPage();

      expect(await screen.findByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Inicio · Diagnóstico IRL/ })).toHaveAttribute(
        'href',
        '/panel',
      );
      expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    });
  });

  it('avisa si no se pudo cargar el panel', async () => {
    server.use(
      mswHttp.get('*/diagnostics', () => HttpResponse.json({ message: 'x' }, { status: 500 })),
    );

    renderPage();

    expect(await screen.findByText('No fue posible cargar tu panel')).toBeInTheDocument();
  });

  it('muestra un estado de carga', () => {
    server.use(mswHttp.get('*/diagnostics', () => new Promise(() => undefined)));

    renderPage();

    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Cargando tu panel…');
  });
});
