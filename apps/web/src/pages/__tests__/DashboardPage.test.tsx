import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { meContextHandler, signIn } from '@/test/fixtures/me-context';
import { clearSession } from '@/shared/auth/session';
import DashboardPage from '../DashboardPage';
import { renderWithClient } from '@/test/render-with-client';
import { initiativeFixture } from '@/test/fixtures/initiative';
import { useQuestionnaireDraftStore } from '@features/questionnaire';
import { useInitiativeDraftStore } from '@features/initiative';

const NEWEST = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const OLDER = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  signIn();
  server.use(meContextHandler());
});
afterEach(() => {
  server.resetHandlers();
  clearSession();
  useQuestionnaireDraftStore.getState().clear();
  useInitiativeDraftStore.getState().clear();
  sessionStorage.clear();
});
afterAll(() => server.close());

const UNFINISHED = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

function diagnostic(id: string, state = 'PROFILE_GENERATED') {
  const deep = state === 'DEEP_ANALYSIS_COMPLETE';
  return {
    id,
    userId: 'user-1',
    state,
    completed: state === 'PROFILE_GENERATED' || deep,
    deepAnalysisAccepted: deep,
    createdAt: '2026-03-01T00:00:00.000Z',
    frameworkVersion: 'KTH-IRL-1.0',
  };
}

/** A completed diagnostic as `GET /diagnostics` lists it. */
function summary(id: string, overrides: Record<string, unknown> = {}) {
  return {
    ...diagnostic(id),
    initiativeName: 'AgroConecta',
    profileComputedAt: '2026-09-30T15:00:00.000Z',
    globalAverage: 3.5,
    ...overrides,
  };
}

/** This tab is filling in `id`: its questionnaire draft names it. */
function draftInThisTab(id: string): void {
  useQuestionnaireDraftStore.getState().initialize(id);
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
  it('muestra la iniciativa del diagnóstico completado más reciente', async () => {
    server.use(
      mswHttp.get('*/diagnostics', () => HttpResponse.json([summary(NEWEST), summary(OLDER)])),
      mswHttp.get('*/diagnostics/:id/initiative', ({ params }) => {
        expect(params.id).toBe(NEWEST);
        return HttpResponse.json(initiativeFixture());
      }),
    );

    renderPage();

    expect(await screen.findByRole('heading', { name: 'AgroConecta' })).toBeInTheDocument();
    expect(screen.getByText('Agroindustria / AgriTech')).toBeInTheDocument();
    expect(screen.getByText(/Validación — Piloto completado/)).toBeInTheDocument();
    expect(screen.getByText('Ahorros de la fundadora')).toBeInTheDocument();
  });

  it('ofrece editar la iniciativa y ver los resultados del más reciente, no el cuestionario', async () => {
    server.use(
      mswHttp.get('*/diagnostics', () => HttpResponse.json([summary(NEWEST)])),
      mswHttp.get('*/diagnostics/:id/initiative', () => HttpResponse.json(initiativeFixture())),
    );

    renderPage();

    const access = await screen.findByRole('navigation', { name: 'Accesos del diagnóstico' });
    expect(within(access).getByRole('link', { name: 'Editar iniciativa' })).toHaveAttribute(
      'href',
      `/diagnosticos/${NEWEST}/iniciativa`,
    );
    expect(within(access).getByRole('link', { name: 'Ver resultados' })).toHaveAttribute(
      'href',
      `/diagnosticos/${NEWEST}/resultados`,
    );
    expect(screen.queryByRole('link', { name: 'Ir al cuestionario' })).not.toBeInTheDocument();
  });

  // Escenario 1: con diagnósticos de fase 1 completada.
  describe('con diagnósticos completados', () => {
    it('lista todos, del más reciente al más antiguo, con su iniciativa, fecha y nivel global', async () => {
      server.use(
        mswHttp.get('*/diagnostics', () =>
          HttpResponse.json([
            summary(NEWEST, { state: 'DEEP_ANALYSIS_COMPLETE', deepAnalysisAccepted: true }),
            summary(OLDER, {
              initiativeName: 'Café Andino',
              profileComputedAt: '2026-08-12T15:00:00.000Z',
              globalAverage: 2,
            }),
          ]),
        ),
        mswHttp.get('*/diagnostics/:id/initiative', () => HttpResponse.json(initiativeFixture())),
      );

      renderPage();

      const history = (await screen.findByRole('heading', { name: 'Tus diagnósticos' })).closest(
        'section',
      )!;
      const rows = within(history).getAllByRole('listitem');
      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveTextContent('AgroConecta');
      expect(rows[0]).toHaveTextContent('Perfil del 30 de septiembre de 2026');
      expect(rows[0]).toHaveTextContent('Nivel IRL global 3,5');
      expect(rows[0]).toHaveTextContent('Con análisis profundo');
      expect(rows[1]).toHaveTextContent('Café Andino');
      expect(rows[1]).toHaveTextContent('Perfil del 12 de agosto de 2026');
      expect(rows[1]).toHaveTextContent('Nivel IRL global 2');
      expect(rows[1]).toHaveTextContent('Perfil inicial');
      expect(
        within(rows[1]).getByRole('link', { name: /Ver resultados de Café Andino/ }),
      ).toHaveAttribute('href', `/diagnosticos/${OLDER}/resultados`);
    });

    it('ofrece también iniciar uno nuevo, que conserva los anteriores', async () => {
      server.use(
        mswHttp.get('*/diagnostics', () => HttpResponse.json([summary(NEWEST)])),
        mswHttp.get('*/diagnostics/:id/initiative', () => HttpResponse.json(initiativeFixture())),
        mswHttp.post('*/diagnostics', () =>
          HttpResponse.json(diagnostic(UNFINISHED, 'STARTED'), { status: 201 }),
        ),
      );
      const user = userEvent.setup();

      renderPage();

      expect(await screen.findByText(/los anteriores se conservan/)).toBeInTheDocument();
      await user.click(await screen.findByRole('button', { name: 'Iniciar un diagnóstico nuevo' }));
      expect(await screen.findByText('ASISTENTE_STUB')).toBeInTheDocument();
    });
  });

  // Escenario 2: cuestionario en curso en esta misma pestaña.
  describe('con un diagnóstico en curso en esta pestaña', () => {
    it('ofrece continuarlo donde quedó', async () => {
      draftInThisTab(UNFINISHED);
      server.use(
        mswHttp.get('*/diagnostics', () => HttpResponse.json([])),
        mswHttp.get('*/diagnostics/:id', ({ params }) => {
          expect(params.id).toBe(UNFINISHED);
          return HttpResponse.json(diagnostic(UNFINISHED, 'WITH_INITIATIVE'));
        }),
      );

      renderPage();

      expect(
        await screen.findByRole('heading', { name: 'Tienes un diagnóstico en curso' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Continuar diagnóstico' })).toHaveAttribute(
        'href',
        `/diagnosticos/${UNFINISHED}/asistente`,
      );
      expect(screen.getByText(/descarta el que tienes en curso/)).toBeInTheDocument();
    });

    it('no lo ofrece si ese diagnóstico ya tiene resultados', async () => {
      draftInThisTab(NEWEST);
      server.use(
        mswHttp.get('*/diagnostics', () => HttpResponse.json([summary(NEWEST)])),
        mswHttp.get('*/diagnostics/:id/initiative', () => HttpResponse.json(initiativeFixture())),
        mswHttp.get('*/diagnostics/:id', () => HttpResponse.json(diagnostic(NEWEST))),
      );

      renderPage();

      expect(await screen.findByRole('heading', { name: 'Tus diagnósticos' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Continuar diagnóstico' })).not.toBeInTheDocument();
    });
  });

  // Escenario 3: cuestionario incompleto de una sesión anterior.
  describe('con un cuestionario incompleto de una sesión anterior', () => {
    it('no lo ofrece: sin borrador en esta pestaña, solo queda iniciar uno nuevo', async () => {
      // The backend keeps the unfinished one, but lists only completed diagnostics.
      server.use(
        mswHttp.get('*/diagnostics', () => HttpResponse.json([])),
        mswHttp.post('*/diagnostics', () =>
          HttpResponse.json(diagnostic(UNFINISHED, 'STARTED'), { status: 201 }),
        ),
      );
      const user = userEvent.setup();

      renderPage();

      expect(
        await screen.findByRole('heading', { name: 'Aún no tienes un diagnóstico' }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Continuar diagnóstico' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Iniciar diagnóstico' }));
      expect(await screen.findByText('ASISTENTE_STUB')).toBeInTheDocument();
    });

    it('tampoco si el borrador de la pestaña es de un diagnóstico que ya se eliminó', async () => {
      draftInThisTab(UNFINISHED);
      server.use(
        mswHttp.get('*/diagnostics', () => HttpResponse.json([])),
        mswHttp.get('*/diagnostics/:id', () =>
          HttpResponse.json({ code: 'NOT_FOUND', message: 'x' }, { status: 404 }),
        ),
      );

      renderPage();

      expect(
        await screen.findByRole('heading', { name: 'Aún no tienes un diagnóstico' }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Continuar diagnóstico' })).not.toBeInTheDocument();
    });
  });

  // Escenario 4: sin diagnósticos completados.
  it('sin ningún diagnóstico, la única acción es iniciar uno, y al crearlo abre el asistente', async () => {
    server.use(
      mswHttp.get('*/diagnostics', () => HttpResponse.json([])),
      mswHttp.post('*/diagnostics', () =>
        HttpResponse.json(diagnostic(NEWEST, 'STARTED'), { status: 201 }),
      ),
    );
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Iniciar diagnóstico' }));

    expect(screen.queryByRole('heading', { name: 'Tus diagnósticos' })).not.toBeInTheDocument();
    expect(await screen.findByText('ASISTENTE_STUB')).toBeInTheDocument();
  });

  describe('navegación', () => {
    it('lleva la navegación principal y el descriptor institucional lleva al panel', async () => {
      server.use(
        mswHttp.get('*/diagnostics', () => HttpResponse.json([summary(NEWEST)])),
        mswHttp.get('*/diagnostics/:id/initiative', () => HttpResponse.json(initiativeFixture())),
      );

      renderPage();

      expect(await screen.findByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Inicio · Diagnóstico IRL/ })).toHaveAttribute(
        'href',
        '/panel',
      );
      expect(await screen.findByRole('button', { name: 'Cuenta' })).toBeInTheDocument();
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
