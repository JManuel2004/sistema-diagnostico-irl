import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ConsentRecord, Initiative } from '@innlab/contracts';
import { createTestQueryClient } from '@/test/render-with-client';
import { SECTORS, STAGES, initiativeFixture } from '@/test/fixtures/initiative';
import { questionnaireFixture } from '@/test/fixtures/questionnaire';
import { useInitiativeDraftStore } from '@features/initiative';
import { useQuestionnaireDraftStore } from '@features/questionnaire';
import DiagnosticWizardPage from '../DiagnosticWizardPage';

const ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const OTHER_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const CONSENT: ConsentRecord = {
  diagnosticId: ID,
  version: 'v1',
  acceptedAt: '2026-03-01T15:30:00.000Z',
};

interface Backend {
  consent: ConsentRecord | null;
  initiative: Initiative | null;
  completed: boolean;
  /** What reached the server, in order. */
  readonly calls: string[];
  failInitiative: boolean;
  consentStatus: number;
}

/** A small in-memory backend: what the wizard reads back is what it wrote. */
function backend(start: Partial<Backend> = {}): Backend {
  const state: Backend = {
    consent: null,
    initiative: null,
    completed: false,
    calls: [],
    failInitiative: false,
    consentStatus: 201,
    ...start,
  };
  const notFound = () =>
    HttpResponse.json(
      { type: 'x', title: 'nf', status: 404, detail: 'nf', code: 'NOT_FOUND' },
      { status: 404 },
    );

  server.use(
    mswHttp.get('*/initiative-catalog/sectors', () => HttpResponse.json(SECTORS)),
    mswHttp.get('*/initiative-catalog/stages', () => HttpResponse.json(STAGES)),
    mswHttp.get('*/api/v1/catalog/questionnaire', () => HttpResponse.json(questionnaireFixture())),
    mswHttp.get('*/diagnostics/:id/consent', () =>
      state.consent ? HttpResponse.json(state.consent) : notFound(),
    ),
    mswHttp.get('*/diagnostics/:id/initiative', () =>
      state.initiative ? HttpResponse.json(state.initiative) : notFound(),
    ),
    mswHttp.get('*/diagnostics/:id', ({ params }) =>
      HttpResponse.json({
        id: params.id,
        userId: 'user-1',
        state: state.completed ? 'PROFILE_GENERATED' : 'STARTED',
        completed: state.completed,
        deepAnalysisAccepted: false,
        createdAt: '2026-03-01T00:00:00.000Z',
        updatedAt: '2026-03-01T00:00:00.000Z',
      }),
    ),
    mswHttp.get('*/diagnostics', () => HttpResponse.json([])),
    mswHttp.post('*/diagnostics/:id/consent', () => {
      state.calls.push('consent');
      if (state.consentStatus !== 201) {
        return HttpResponse.json(
          { type: 'x', title: 'c', status: state.consentStatus, detail: 'c', code: 'CONFLICT' },
          { status: state.consentStatus },
        );
      }
      state.consent = CONSENT;
      return HttpResponse.json(CONSENT, { status: 201 });
    }),
    mswHttp.post('*/diagnostics/:id/initiative', async ({ request }) => {
      state.calls.push('initiative');
      if (state.failInitiative) return HttpResponse.json({ message: 'boom' }, { status: 500 });
      const body = (await request.json()) as Record<string, unknown>;
      state.initiative = initiativeFixture({ name: String(body.name) });
      return HttpResponse.json(state.initiative, { status: 201 });
    }),
  );
  return state;
}

function Where(): React.JSX.Element {
  return <output data-testid="where">{useLocation().pathname}</output>;
}

function renderWizard(path = `/diagnosticos/${ID}/asistente`): ReturnType<typeof render> {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/diagnosticos/:id/asistente/:step?" element={<DiagnosticWizardPage />} />
          <Route path="/diagnosticos/:id/resultados" element={<div>RESULTADOS_STUB</div>} />
        </Routes>
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillInitiative(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Nombre de la iniciativa'), 'AgroConecta');
  await user.selectOptions(screen.getByLabelText('Sector'), '1');
  await user.selectOptions(screen.getByLabelText('Etapa'), '2');
  await user.type(screen.getByLabelText('Tipo de producto o servicio'), 'App web');
  await user.type(screen.getByLabelText('Etapa declarada'), 'Piloto completado');
  await user.type(screen.getByLabelText('Personas en el equipo'), '3');
  await user.type(screen.getByLabelText('Equipo'), 'Fundadora y equipo');
  await user.type(screen.getByLabelText('Mercado objetivo'), 'Productores de café');
  await user.type(screen.getByLabelText('Financiamiento actual'), 'Ahorros');
}

const where = () => screen.getByTestId('where').textContent;
const step = (name: string) => `/diagnosticos/${ID}/asistente/${name}`;

describe('DiagnosticWizardPage — el asistente', () => {
  let scrollTo: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useInitiativeDraftStore.getState().initialize(null);
    useInitiativeDraftStore.getState().clear();
    useQuestionnaireDraftStore.getState().clear();
    sessionStorage.clear();
    scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  });

  afterEach(() => {
    scrollTo.mockRestore();
  });

  describe('estructura', () => {
    it('es un solo recorrido de cuatro pasos y no lleva navegación principal', async () => {
      backend();

      renderWizard();

      const stepper = await screen.findByRole('navigation', { name: 'Pasos del diagnóstico' });
      expect(within(stepper).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
        '1Iniciativa',
        '2Consentimiento',
        '3Cuestionario',
        '4Resumen',
      ]);
      expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
    });

    it('el descriptor institucional lleva a la portada, no al panel', async () => {
      backend();

      renderWizard();

      expect(
        await screen.findByRole('link', { name: /Inicio · Diagnóstico IRL/ }),
      ).toHaveAttribute('href', '/');
    });

    it('marca el paso actual', async () => {
      backend();

      renderWizard();

      const stepper = await screen.findByRole('navigation', { name: 'Pasos del diagnóstico' });
      expect(within(stepper).getByText('Iniciativa').closest('[aria-current]')).toHaveAttribute(
        'aria-current',
        'step',
      );
    });

    it('cada paso se abre desde arriba de la página', async () => {
      backend();

      renderWizard();
      await screen.findByLabelText('Nombre de la iniciativa');

      expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
    });
  });

  describe('orden de los pasos', () => {
    it('un diagnóstico nuevo entra por la iniciativa', async () => {
      backend();

      renderWizard();

      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
        'Cuéntanos de tu iniciativa',
      );
      expect(where()).toBe(step('iniciativa'));
    });

    it.each(['consentimiento', 'cuestionario', 'resumen'])(
      'no se puede saltar al paso «%s» sin haber completado los anteriores',
      async (target) => {
        backend();

        renderWizard(step(target));

        expect(await screen.findByLabelText('Nombre de la iniciativa')).toBeInTheDocument();
        expect(where()).toBe(step('iniciativa'));
      },
    );

    it('un paso que no existe lleva al que corresponde', async () => {
      backend();

      renderWizard(step('inexistente'));

      await screen.findByLabelText('Nombre de la iniciativa');
      expect(where()).toBe(step('iniciativa'));
    });

    it('un diagnóstico con resultados no se reanuda: abre los resultados', async () => {
      backend({ completed: true });

      renderWizard();

      expect(await screen.findByText('RESULTADOS_STUB')).toBeInTheDocument();
    });
  });

  // RF-03 / RNF-06: the initiative is asked first, but nothing is stored before the consent.
  describe('paso 1 → 2: la iniciativa no se guarda antes del consentimiento', () => {
    it('continuar con el formulario válido abre el consentimiento sin enviar nada al servidor', async () => {
      const api = backend();
      const user = userEvent.setup();

      renderWizard();
      await fillInitiative(user);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
        'Consentimiento para el tratamiento de datos',
      );
      expect(where()).toBe(step('consentimiento'));
      expect(api.calls).toEqual([]);
    });

    it('con el formulario vacío no avanza y marca cada campo', async () => {
      const api = backend();
      const user = userEvent.setup();

      renderWizard();
      await user.click(await screen.findByRole('button', { name: 'Continuar' }));

      expect(where()).toBe(step('iniciativa'));
      expect(api.calls).toEqual([]);
      expect(screen.getByLabelText('Nombre de la iniciativa')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByRole('alert')).toHaveTextContent('Revisa los campos marcados');
    });

    it('lo escrito sobrevive a ir y volver entre el paso 1 y el 2', async () => {
      backend();
      const user = userEvent.setup();

      renderWizard();
      await fillInitiative(user);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));
      await screen.findByText('Autorización para el tratamiento de datos personales');
      await user.click(screen.getByRole('link', { name: 'Atrás' }));

      expect(await screen.findByLabelText('Nombre de la iniciativa')).toHaveValue('AgroConecta');
      expect(screen.getByLabelText('Sector')).toHaveValue('1');
      expect(screen.getByLabelText('Personas en el equipo')).toHaveValue(3);
    });

    it('recargar la página en el paso 2 no pierde el formulario del paso 1', async () => {
      backend();
      const user = userEvent.setup();

      const first = renderWizard();
      await fillInitiative(user);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));
      await screen.findByText('Autorización para el tratamiento de datos personales');
      first.unmount();

      renderWizard(step('consentimiento'));

      expect(
        await screen.findByText('Autorización para el tratamiento de datos personales'),
      ).toBeInTheDocument();
      expect(where()).toBe(step('consentimiento'));
    });

    it('el borrador de otro diagnóstico no cuenta', async () => {
      backend();
      useInitiativeDraftStore.getState().initialize(OTHER_ID);
      useInitiativeDraftStore.getState().save({
        name: 'Ajena',
        sectorId: '1',
        productType: 'x',
        stageId: '1',
        declaredStage: 'x',
        teamSize: 1,
        teamDescription: 'x',
        targetMarket: 'x',
        currentFunding: 'x',
      });

      renderWizard(step('consentimiento'));

      expect(await screen.findByLabelText('Nombre de la iniciativa')).toHaveValue('');
      expect(where()).toBe(step('iniciativa'));
    });
  });

  describe('paso 2: consentimiento', () => {
    async function toConsent(user: ReturnType<typeof userEvent.setup>) {
      await fillInitiative(user);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));
      await screen.findByText('Autorización para el tratamiento de datos personales');
    }

    it('muestra el texto del consentimiento y no deja continuar sin aceptarlo', async () => {
      const api = backend();
      const user = userEvent.setup();

      renderWizard();
      await toConsent(user);

      expect(screen.getByText('Responsable del tratamiento')).toBeInTheDocument();
      expect(screen.getByText('Tus derechos como titular')).toBeInTheDocument();
      const accept = screen.getByRole('button', { name: 'Aceptar y continuar' });
      expect(accept).toBeDisabled();
      expect(api.calls).toEqual([]);

      await user.click(screen.getByRole('checkbox'));
      expect(accept).toBeEnabled();
    });

    it('al aceptar registra primero el consentimiento y luego la iniciativa, y abre el cuestionario', async () => {
      const api = backend();
      const user = userEvent.setup();

      renderWizard();
      await toConsent(user);
      await user.click(screen.getByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));

      await waitFor(() => {
        expect(where()).toBe(step('cuestionario'));
      });
      expect(api.calls).toEqual(['consent', 'initiative']);
      expect(api.initiative?.name).toBe('AgroConecta');
      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Cuestionario IRL');
    });

    it('vacía el borrador cuando la iniciativa quedó registrada', async () => {
      backend();
      const user = userEvent.setup();

      renderWizard();
      await toConsent(user);
      await user.click(screen.getByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));
      await waitFor(() => {
        expect(where()).toBe(step('cuestionario'));
      });

      expect(useInitiativeDraftStore.getState().command).toBeNull();
    });

    it('si la iniciativa falla tras aceptar, avisa y el reintento no repite el consentimiento', async () => {
      const api = backend({ failInitiative: true });
      const user = userEvent.setup();

      renderWizard();
      await toConsent(user);
      await user.click(screen.getByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Tu aceptación quedó registrada');
      expect(where()).toBe(step('consentimiento'));

      api.failInitiative = false;
      await user.click(await screen.findByRole('button', { name: 'Guardar iniciativa y continuar' }));

      await waitFor(() => {
        expect(where()).toBe(step('cuestionario'));
      });
      expect(api.calls).toEqual(['consent', 'initiative', 'initiative']);
    });

    it('si el texto cambió mientras se leía (409) pide recargar y no registra la iniciativa', async () => {
      const api = backend({ consentStatus: 409 });
      const user = userEvent.setup();

      renderWizard();
      await toConsent(user);
      await user.click(screen.getByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('El texto del consentimiento cambió');
      expect(api.calls).toEqual(['consent']);
      expect(where()).toBe(step('consentimiento'));
    });

    it('un error del servidor al aceptar no registra la iniciativa', async () => {
      const api = backend({ consentStatus: 500 });
      const user = userEvent.setup();

      renderWizard();
      await toConsent(user);
      await user.click(screen.getByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible registrar tu aceptación');
      expect(api.calls).toEqual(['consent']);
    });
  });

  describe('reanudar un diagnóstico', () => {
    it('con la iniciativa y el consentimiento ya registrados va al cuestionario', async () => {
      backend({ consent: CONSENT, initiative: initiativeFixture() });

      renderWizard();

      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Cuestionario IRL');
      expect(where()).toBe(step('cuestionario'));
    });

    it('con el consentimiento pero sin iniciativa vuelve a pedir la iniciativa y la registra en el acto', async () => {
      const api = backend({ consent: CONSENT });
      const user = userEvent.setup();

      renderWizard();
      await fillInitiative(user);
      expect(where()).toBe(step('iniciativa'));
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      // The consent was already given: no second consent, and the initiative is saved right away.
      await waitFor(() => {
        expect(where()).toBe(step('consentimiento'));
      });
      expect(api.calls).toEqual(['initiative']);
      expect(await screen.findByText('Ya aceptaste este texto')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Continuar' }));
      await waitFor(() => {
        expect(where()).toBe(step('cuestionario'));
      });
      expect(api.calls).toEqual(['initiative']);
    });

    it('con el borrador del paso 1 y el consentimiento, pero sin iniciativa, ofrece guardarla', async () => {
      const api = backend({ consent: CONSENT });
      useInitiativeDraftStore.getState().initialize(ID);
      useInitiativeDraftStore.getState().save({
        name: 'AgroConecta',
        sectorId: '1',
        productType: 'App web',
        stageId: '2',
        declaredStage: 'Piloto completado',
        teamSize: 3,
        teamDescription: 'Fundadora y equipo',
        targetMarket: 'Productores de café',
        currentFunding: 'Ahorros',
      });
      const user = userEvent.setup();

      renderWizard();

      expect(await screen.findByText('Ya aceptaste este texto')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Guardar iniciativa y continuar' }));
      await waitFor(() => {
        expect(where()).toBe(step('cuestionario'));
      });
      expect(api.calls).toEqual(['initiative']);
    });

    it('permite volver a corregir la iniciativa ya registrada y guarda el cambio en el acto', async () => {
      const api = backend({ consent: CONSENT, initiative: initiativeFixture() });
      const user = userEvent.setup();

      renderWizard(step('iniciativa'));
      const name = await screen.findByLabelText('Nombre de la iniciativa');
      await waitFor(() => {
        expect(name).toHaveValue('AgroConecta');
      });
      await user.clear(name);
      await user.type(name, 'AgroConecta v2');
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      await waitFor(() => {
        expect(where()).toBe(step('consentimiento'));
      });
      expect(api.calls).toEqual(['initiative']);
      expect(api.initiative?.name).toBe('AgroConecta v2');
    });
  });

  describe('navegación entre pasos', () => {
    it('los pasos anteriores son enlaces; el actual y los siguientes no', async () => {
      backend({ consent: CONSENT, initiative: initiativeFixture() });

      renderWizard();

      await screen.findByRole('heading', { level: 1, name: 'Cuestionario IRL' });
      const stepper = screen.getByRole('navigation', { name: 'Pasos del diagnóstico' });
      expect(within(stepper).getByRole('link', { name: /Iniciativa/ })).toHaveAttribute(
        'href',
        step('iniciativa'),
      );
      expect(within(stepper).getByRole('link', { name: /Consentimiento/ })).toHaveAttribute(
        'href',
        step('consentimiento'),
      );
      expect(within(stepper).queryByRole('link', { name: /Cuestionario/ })).not.toBeInTheDocument();
      expect(within(stepper).queryByRole('link', { name: /Resumen/ })).not.toBeInTheDocument();
    });

    it('el enlace de un paso anterior vuelve a él', async () => {
      backend({ consent: CONSENT, initiative: initiativeFixture() });
      const user = userEvent.setup();

      renderWizard();
      await screen.findByRole('heading', { level: 1, name: 'Cuestionario IRL' });
      await user.click(
        within(screen.getByRole('navigation', { name: 'Pasos del diagnóstico' })).getByRole('link', {
          name: /Consentimiento/,
        }),
      );

      expect(await screen.findByText('Ya aceptaste este texto')).toBeInTheDocument();
    });
  });

  // The questionnaire used to scroll to its dimension tabs on mount, hiding the text above them.
  describe('el cuestionario dentro del asistente', () => {
    const scrollIntoView = vi.fn();

    beforeEach(() => {
      scrollIntoView.mockClear();
      Element.prototype.scrollIntoView = scrollIntoView;
    });

    afterEach(() => {
      // @ts-expect-error restores jsdom's state, which does not define the method.
      delete Element.prototype.scrollIntoView;
    });

    it('carga desde arriba: no salta a las pestañas de dimensión', async () => {
      backend({ consent: CONSENT, initiative: initiativeFixture() });

      renderWizard();

      await screen.findByRole('tablist', { name: 'Dimensiones IRL' });
      expect(scrollIntoView).not.toHaveBeenCalled();
      expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
      expect(screen.getByRole('heading', { level: 1, name: 'Cuestionario IRL' })).toBeInTheDocument();
    });

    it('sigue volviendo hacia arriba al cambiar de dimensión', async () => {
      backend({ consent: CONSENT, initiative: initiativeFixture() });
      const user = userEvent.setup();

      renderWizard();
      await screen.findByRole('tablist', { name: 'Dimensiones IRL' });
      await user.click(screen.getByRole('tab', { name: 'CRL' }));

      await waitFor(() => {
        expect(scrollIntoView).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('carga y errores', () => {
    it('muestra un estado de carga mientras consulta el diagnóstico', () => {
      server.use(mswHttp.get('*/diagnostics/:id', () => new Promise(() => undefined)));
      server.use(mswHttp.get('*/diagnostics/:id/consent', () => new Promise(() => undefined)));
      server.use(mswHttp.get('*/diagnostics/:id/initiative', () => new Promise(() => undefined)));

      renderWizard();

      expect(screen.getByText('Cargando tu diagnóstico…')).toBeInTheDocument();
    });

    it('avisa si no se pudo abrir el diagnóstico', async () => {
      backend();
      server.use(
        mswHttp.get('*/diagnostics/:id', () => HttpResponse.json({ message: 'x' }, { status: 500 })),
      );

      renderWizard();

      expect(await screen.findByText('No fue posible abrir tu diagnóstico')).toBeInTheDocument();
    });
  });
});
