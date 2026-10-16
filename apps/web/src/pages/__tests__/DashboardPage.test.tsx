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
  // Nothing in progress unless a test says otherwise.
  server.use(
    meContextHandler(),
    mswHttp.get('*/diagnostics/in-progress', () =>
      HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 }),
    ),
  );
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
    deepAnalysisCompleted: deep,
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
            summary(NEWEST, {
              state: 'DEEP_ANALYSIS_COMPLETE',
              deepAnalysisAccepted: true,
              deepAnalysisCompleted: true,
            }),
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

  // Escenario 2: un diagnóstico sin terminar, de esta o de otra sesión.
  describe('con un diagnóstico en curso', () => {
    function inProgressHandlers(answered = 2) {
      return [
        mswHttp.get('*/diagnostics', () => HttpResponse.json([])),
        mswHttp.get('*/diagnostics/in-progress', () =>
          HttpResponse.json(diagnostic(UNFINISHED, 'QUESTIONNAIRE_IN_PROGRESS')),
        ),
        mswHttp.get('*/diagnostics/:id/questionnaire/draft', ({ params }) => {
          expect(params.id).toBe(UNFINISHED);
          return HttpResponse.json({
            diagnosticId: UNFINISHED,
            entries: Array.from({ length: answered }, (_, i) => ({
              statementId: String(i + 1),
              value: 3,
              justification: null,
            })),
            updatedAt: '2026-10-16T12:00:00.000Z',
          });
        }),
      ];
    }

    it('lo ofrece aunque esta pestaña no tenga nada: sus respuestas están en el servidor', async () => {
      server.use(...inProgressHandlers());

      renderPage();

      expect(
        await screen.findByRole('heading', { name: 'Tienes un diagnóstico en curso' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Continuar diagnóstico' })).toHaveAttribute(
        'href',
        `/diagnosticos/${UNFINISHED}/asistente`,
      );
      expect(
        await screen.findByText(/llevas 2 de 48 afirmaciones respondidas/),
      ).toBeInTheDocument();
    });

    it('iniciar uno nuevo pregunta antes, y continuar lleva al que tiene', async () => {
      let started = false;
      server.use(
        ...inProgressHandlers(5),
        mswHttp.post('*/diagnostics', () => {
          started = true;
          return HttpResponse.json(diagnostic(NEWEST, 'STARTED'), { status: 201 });
        }),
      );
      const user = userEvent.setup();

      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Iniciar un diagnóstico nuevo' }));

      const question = await screen.findByRole('heading', {
        name: 'Tienes un diagnóstico sin terminar',
      });
      expect(question).toHaveFocus();
      expect(screen.getByText(/Tiene 5 de 48 afirmaciones respondidas/)).toBeInTheDocument();
      expect(screen.getByText(/se descartan y no se pueden recuperar/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Continuar el que tengo/ })).toHaveAttribute(
        'href',
        `/diagnosticos/${UNFINISHED}/asistente`,
      );
      expect(started).toBe(false);
    });

    it('descartarlo envía esa decisión y abre el asistente del nuevo', async () => {
      let query = '';
      server.use(
        ...inProgressHandlers(),
        mswHttp.post('*/diagnostics', ({ request }) => {
          query = new URL(request.url).search;
          return HttpResponse.json(diagnostic(NEWEST, 'STARTED'), { status: 201 });
        }),
      );
      const user = userEvent.setup();

      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Iniciar un diagnóstico nuevo' }));
      await user.click(
        await screen.findByRole('button', { name: 'Descartarlo y empezar uno nuevo' }),
      );

      expect(await screen.findByText('ASISTENTE_STUB')).toBeInTheDocument();
      expect(query).toBe('?discardInProgress=true');
    });

    it('cancelar vuelve al panel sin descartar nada', async () => {
      let started = false;
      server.use(
        ...inProgressHandlers(),
        mswHttp.post('*/diagnostics', () => {
          started = true;
          return HttpResponse.json(diagnostic(NEWEST, 'STARTED'), { status: 201 });
        }),
      );
      const user = userEvent.setup();

      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Iniciar un diagnóstico nuevo' }));
      await user.click(await screen.findByRole('button', { name: 'Cancelar' }));

      expect(
        await screen.findByRole('heading', { name: 'Tienes un diagnóstico en curso' }),
      ).toBeInTheDocument();
      expect(started).toBe(false);
    });

    it('si el servidor avisa de uno que el panel no conocía (otro dispositivo), pregunta en vez de descartarlo', async () => {
      let known = false;
      server.use(
        mswHttp.get('*/diagnostics', () => HttpResponse.json([])),
        mswHttp.get('*/diagnostics/in-progress', () =>
          known
            ? HttpResponse.json(diagnostic(UNFINISHED, 'WITH_INITIATIVE'))
            : HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 }),
        ),
        mswHttp.get('*/diagnostics/:id/questionnaire/draft', () =>
          HttpResponse.json({ diagnosticId: UNFINISHED, entries: [], updatedAt: null }),
        ),
        mswHttp.post('*/diagnostics', () => {
          known = true;
          return HttpResponse.json(
            {
              type: 'https://errors.innlab.icesi.edu.co/diagnosis_in_progress',
              title: 'diagnosis in progress',
              status: 409,
              code: 'DIAGNOSIS_IN_PROGRESS',
            },
            { status: 409 },
          );
        }),
      );
      const user = userEvent.setup();

      renderPage();
      await user.click(await screen.findByRole('button', { name: 'Iniciar diagnóstico' }));

      expect(
        await screen.findByRole('heading', { name: 'Tienes un diagnóstico sin terminar' }),
      ).toBeInTheDocument();
      expect(screen.queryByText('ASISTENTE_STUB')).not.toBeInTheDocument();
    });

    it('no ofrece el borrador que esta pestaña guarde de un diagnóstico que ya no está en curso', async () => {
      draftInThisTab(UNFINISHED);
      server.use(mswHttp.get('*/diagnostics', () => HttpResponse.json([])));

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
