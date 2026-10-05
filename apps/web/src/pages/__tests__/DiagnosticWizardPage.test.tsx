import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import type { Initiative, InitiativeSummary } from '@innlab/contracts';
import { createTestQueryClient } from '@/test/render-with-client';
import { clearSession, saveSession } from '@/shared/auth/session';
import { meContextHandler } from '@/test/fixtures/me-context';
import {
  CONSENT_TERMS,
  INITIATIVE_ID,
  SECTORS,
  STAGES,
  initiativeFixture,
  initiativeSummaryFixture,
} from '@/test/fixtures/initiative';
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

const NEW_INITIATIVE_ID = 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';

const COMMAND = {
  name: 'AgroConecta',
  sectorId: '1',
  productType: 'App web',
  stageId: '2',
  declaredStage: 'Piloto completado',
  teamSize: 3,
  teamDescription: 'Fundadora y equipo',
  targetMarket: 'Productores de café',
  currentFunding: 'Ahorros',
};

interface Backend {
  /** The user's initiatives, as `GET /initiatives` lists them. */
  initiatives: InitiativeSummary[];
  /** The profile registered for the diagnostic. */
  profile: Initiative | null;
  completed: boolean;
  /** What reached the server, in order. */
  readonly calls: string[];
  failInitiative: boolean;
  consentStatus: number;
}

/** A small in-memory backend: what the wizard reads back is what it wrote. */
function backend(start: Partial<Backend> = {}): Backend {
  const state: Backend = {
    initiatives: [],
    profile: null,
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
  const consentFailure = () =>
    HttpResponse.json(
      { type: 'x', title: 'c', status: state.consentStatus, detail: 'c', code: 'CONFLICT' },
      { status: state.consentStatus },
    );
  const acceptance = (initiativeId: string) => ({
    initiativeId,
    version: 'v1',
    acceptedAt: '2026-09-21T15:30:00.000Z',
  });

  server.use(
    mswHttp.get('*/initiative-catalog/sectors', () => HttpResponse.json(SECTORS)),
    mswHttp.get('*/initiative-catalog/stages', () => HttpResponse.json(STAGES)),
    mswHttp.get('*/api/v1/catalog/questionnaire', () => HttpResponse.json(questionnaireFixture())),
    mswHttp.get('*/consent-terms/current', () => HttpResponse.json(CONSENT_TERMS)),
    mswHttp.get('*/initiatives', () => HttpResponse.json(state.initiatives)),
    mswHttp.post('*/initiatives', () => {
      state.calls.push('create');
      if (state.consentStatus !== 201) return consentFailure();
      const created = initiativeSummaryFixture({
        id: NEW_INITIATIVE_ID,
        consent: acceptance(NEW_INITIATIVE_ID),
        latestProfile: null,
      });
      state.initiatives = [created, ...state.initiatives];
      return HttpResponse.json(created, { status: 201 });
    }),
    mswHttp.post('*/initiatives/:id/consent', ({ params }) => {
      state.calls.push('consent');
      if (state.consentStatus !== 201) return consentFailure();
      const record = acceptance(String(params.id));
      state.initiatives = state.initiatives.map((i) =>
        i.id === params.id ? { ...i, consent: record, consentCurrent: true } : i,
      );
      return HttpResponse.json(record, { status: 201 });
    }),
    mswHttp.get('*/diagnostics/:id/initiative', () =>
      state.profile ? HttpResponse.json(state.profile) : notFound(),
    ),
    mswHttp.get('*/diagnostics/:id', ({ params }) =>
      HttpResponse.json({
        id: params.id,
        userId: 'user-1',
        state: state.completed ? 'PROFILE_GENERATED' : 'STARTED',
        completed: state.completed,
        deepAnalysisAccepted: false,
        frameworkVersion: 'KTH-IRL-1.0',
        createdAt: '2026-03-01T00:00:00.000Z',
      }),
    ),
    mswHttp.get('*/diagnostics', () => HttpResponse.json([])),
    mswHttp.post('*/diagnostics/:id/initiative', async ({ request }) => {
      state.calls.push('initiative');
      if (state.failInitiative) return HttpResponse.json({ message: 'boom' }, { status: 500 });
      const body = (await request.json()) as Record<string, unknown>;
      state.profile = initiativeFixture({
        name: String(body.name),
        initiativeId: String(body.initiativeId),
      });
      return HttpResponse.json(state.profile, { status: 201 });
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
      expect(
        within(stepper)
          .getAllByRole('listitem')
          .map((li) => li.textContent),
      ).toEqual(['1Consentimiento', '2Iniciativa', '3Cuestionario', '4Resumen']);
      expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
    });

    it('con la sesión iniciada, el descriptor institucional lleva al panel, no a la portada', async () => {
      backend();
      // With a session the account menu asks for the user's context.
      server.use(meContextHandler());
      saveSession({ token: 'id-token', accessToken: 'access-token' });

      try {
        renderWizard();

        expect(
          await screen.findByRole('link', { name: /Inicio · Diagnóstico IRL/ }),
        ).toHaveAttribute('href', '/panel');
      } finally {
        clearSession();
      }
    });

    it('ofrece volver al panel desde cualquier paso', async () => {
      backend();

      renderWizard();

      expect(await screen.findByRole('link', { name: 'Volver al panel' })).toHaveAttribute(
        'href',
        '/panel',
      );
    });

    it('marca el paso actual', async () => {
      backend();

      renderWizard();

      const stepper = await screen.findByRole('navigation', { name: 'Pasos del diagnóstico' });
      expect(within(stepper).getByText('Consentimiento').closest('[aria-current]')).toHaveAttribute(
        'aria-current',
        'step',
      );
    });

    it('cada paso se abre desde arriba de la página', async () => {
      backend();

      renderWizard();
      await screen.findByRole('heading', {
        level: 1,
        name: 'Consentimiento para el tratamiento de datos',
      });

      expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
    });
  });

  describe('orden de los pasos', () => {
    it('un diagnóstico nuevo entra por el consentimiento', async () => {
      backend();

      renderWizard();

      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
        'Consentimiento para el tratamiento de datos',
      );
      expect(where()).toBe(step('consentimiento'));
    });

    it.each(['iniciativa', 'cuestionario', 'resumen'])(
      'no se puede saltar al paso «%s» sin haber completado los anteriores',
      async (target) => {
        backend();

        renderWizard(step(target));

        expect(
          await screen.findByRole('heading', {
            level: 1,
            name: 'Consentimiento para el tratamiento de datos',
          }),
        ).toBeInTheDocument();
        expect(where()).toBe(step('consentimiento'));
      },
    );

    it('un paso que no existe lleva al que corresponde', async () => {
      backend();

      renderWizard(step('inexistente'));

      await screen.findByRole('heading', {
        level: 1,
        name: 'Consentimiento para el tratamiento de datos',
      });
      expect(where()).toBe(step('consentimiento'));
    });

    it('un diagnóstico con resultados no se reanuda: abre los resultados', async () => {
      backend({ completed: true });

      renderWizard();

      expect(await screen.findByText('RESULTADOS_STUB')).toBeInTheDocument();
    });
  });

  // RF-03 / RNF-06: the consent is shown first, and nothing is stored before it is accepted.
  describe('paso 1 → 2: el consentimiento va antes de pedir la iniciativa', () => {
    async function acceptAndOpenForm(user: ReturnType<typeof userEvent.setup>) {
      await user.click(await screen.findByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));
      await screen.findByLabelText('Nombre de la iniciativa');
    }

    it('aceptar el texto abre la iniciativa sin enviar nada al servidor', async () => {
      const api = backend();
      const user = userEvent.setup();

      renderWizard();
      await acceptAndOpenForm(user);

      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
        'Cuéntanos de tu iniciativa',
      );
      expect(where()).toBe(step('iniciativa'));
      expect(api.calls).toEqual([]);
    });

    it('con el formulario vacío no avanza y marca cada campo', async () => {
      const api = backend();
      const user = userEvent.setup();

      renderWizard();
      await acceptAndOpenForm(user);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      expect(where()).toBe(step('iniciativa'));
      expect(api.calls).toEqual([]);
      expect(screen.getByLabelText('Nombre de la iniciativa')).toHaveAttribute(
        'aria-invalid',
        'true',
      );
      expect(screen.getByRole('alert')).toHaveTextContent('Revisa los campos marcados');
    });

    it('«Atrás» y «Continuar» van en la misma fila, como en los demás pasos', async () => {
      backend();
      const user = userEvent.setup();

      renderWizard();
      await acceptAndOpenForm(user);

      const back = screen.getByRole('link', { name: 'Atrás' });
      const next = screen.getByRole('button', { name: 'Continuar' });
      expect(back.parentElement).toBe(next.parentElement);
      expect(back.parentElement).toHaveClass('sm:justify-between');
    });

    it('lo escrito sobrevive a ir y volver entre la iniciativa y el consentimiento', async () => {
      backend();
      const user = userEvent.setup();

      renderWizard();
      await acceptAndOpenForm(user);
      await fillInitiative(user);
      await user.click(screen.getByRole('link', { name: 'Atrás' }));
      await screen.findByText('Puedes continuar y contarnos de tu iniciativa.');
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      expect(await screen.findByLabelText('Nombre de la iniciativa')).toHaveValue('AgroConecta');
      expect(screen.getByLabelText('Sector')).toHaveValue('1');
      expect(screen.getByLabelText('Personas en el equipo')).toHaveValue(3);
    });

    it('recargar la página en la iniciativa no pierde el formulario ni la aceptación', async () => {
      backend();
      const user = userEvent.setup();

      const first = renderWizard();
      await acceptAndOpenForm(user);
      await fillInitiative(user);
      await screen.findByDisplayValue('AgroConecta');
      first.unmount();

      renderWizard(step('iniciativa'));

      expect(await screen.findByLabelText('Nombre de la iniciativa')).toHaveValue('AgroConecta');
      expect(where()).toBe(step('iniciativa'));
    });

    it('el borrador de otro diagnóstico no cuenta', async () => {
      backend();
      useInitiativeDraftStore.getState().initialize(OTHER_ID);
      useInitiativeDraftStore.getState().acceptTerms('v1');
      useInitiativeDraftStore.getState().save({
        initiativeId: null,
        command: { ...COMMAND, name: 'Ajena' },
      });

      renderWizard(step('iniciativa'));

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: 'Consentimiento para el tratamiento de datos',
        }),
      ).toBeInTheDocument();
      expect(where()).toBe(step('consentimiento'));
    });
  });

  describe('paso 1: consentimiento', () => {
    it('muestra el texto del consentimiento y no deja continuar sin aceptarlo', async () => {
      const api = backend();
      const user = userEvent.setup();

      renderWizard();

      expect(await screen.findByText('Responsable del tratamiento')).toBeInTheDocument();
      expect(screen.getByText(CONSENT_TERMS.checkboxLabel)).toBeInTheDocument();
      const accept = screen.getByRole('button', { name: 'Aceptar y continuar' });
      expect(accept).toBeDisabled();
      expect(api.calls).toEqual([]);

      await user.click(screen.getByRole('checkbox'));
      expect(accept).toBeEnabled();
    });

    it('al aceptar y completar la iniciativa la crea, registra su información y abre el cuestionario', async () => {
      const api = backend();
      const user = userEvent.setup();

      renderWizard();
      await user.click(await screen.findByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));
      await fillInitiative(user);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      await waitFor(() => {
        expect(where()).toBe(step('cuestionario'));
      });
      expect(api.calls).toEqual(['create', 'initiative']);
      expect(api.profile?.name).toBe('AgroConecta');
      expect(api.profile?.initiativeId).toBe(NEW_INITIATIVE_ID);
      expect(toast.success).toHaveBeenCalledWith('Consentimiento registrado.');
      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
        'Cuestionario IRL',
      );
    });

    it('vacía el borrador cuando la iniciativa quedó registrada', async () => {
      backend();
      const user = userEvent.setup();

      renderWizard();
      await user.click(await screen.findByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));
      await fillInitiative(user);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));
      await waitFor(() => {
        expect(where()).toBe(step('cuestionario'));
      });

      expect(useInitiativeDraftStore.getState().draft).toBeNull();
      expect(useInitiativeDraftStore.getState().acceptedTermsVersion).toBeNull();
    });

    it('si la información falla tras crear la iniciativa, avisa y el reintento no crea otra', async () => {
      const api = backend({ failInitiative: true });
      const user = userEvent.setup();

      renderWizard();
      await user.click(await screen.findByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));
      await fillInitiative(user);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Tu aceptación quedó registrada'),
        );
      });
      expect(where()).toBe(step('iniciativa'));

      api.failInitiative = false;
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      await waitFor(() => {
        expect(where()).toBe(step('cuestionario'));
      });
      expect(api.calls).toEqual(['create', 'initiative', 'initiative']);
      expect(api.initiatives).toHaveLength(1);
      // The first try registered the acceptance and failed to save the profile.
      // The retry only saves, so that is the success it announces.
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith('Iniciativa guardada.');
    });

    it('si el texto cambió mientras se leía (409) pide recargar y no registra la iniciativa', async () => {
      const api = backend({ consentStatus: 409 });
      const user = userEvent.setup();

      renderWizard();
      await user.click(await screen.findByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));
      await fillInitiative(user);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('El texto del consentimiento cambió'),
        );
      });
      // The notice comes first and the navigation right after: wait for both.
      await waitFor(() => {
        expect(where()).toBe(step('consentimiento'));
      });
      expect(api.calls).toEqual(['create']);
    });

    it('un error del servidor al aceptar no registra la iniciativa', async () => {
      const api = backend({ consentStatus: 500 });
      const user = userEvent.setup();

      renderWizard();
      await user.click(await screen.findByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));
      await fillInitiative(user);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('No fue posible registrar tu aceptación'),
        );
      });
      expect(api.calls).toEqual(['create']);
      expect(where()).toBe(step('iniciativa'));
    });
  });

  // The consent belongs to the initiative: an initiative that accepted the current text needs no second one.
  describe('elegir una iniciativa existente', () => {
    async function openForm(user: ReturnType<typeof userEvent.setup>) {
      await user.click(await screen.findByRole('checkbox'));
      await user.click(screen.getByRole('button', { name: 'Aceptar y continuar' }));
    }

    it('ofrece las iniciativas del usuario y precarga la información de la más reciente', async () => {
      backend({ initiatives: [initiativeSummaryFixture()] });
      const user = userEvent.setup();

      renderWizard();
      await openForm(user);

      expect(
        await screen.findByRole('radiogroup', {
          name: '¿Sobre qué iniciativa es este diagnóstico?',
        }),
      ).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /AgroConecta/ })).toBeChecked();
      expect(await screen.findByLabelText('Nombre de la iniciativa')).toHaveValue('AgroConecta');
    });

    it('elegir «Nueva iniciativa» deja el formulario vacío', async () => {
      backend({ initiatives: [initiativeSummaryFixture()] });
      const user = userEvent.setup();

      renderWizard();
      await openForm(user);
      await user.click(await screen.findByRole('radio', { name: 'Nueva iniciativa' }));

      expect(await screen.findByLabelText('Nombre de la iniciativa')).toHaveValue('');
    });

    it('con el consentimiento vigente registra la información en el acto y abre el cuestionario', async () => {
      const api = backend({ initiatives: [initiativeSummaryFixture()] });
      const user = userEvent.setup();

      renderWizard();
      await openForm(user);
      await screen.findByDisplayValue('AgroConecta');
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      await waitFor(() => {
        expect(where()).toBe(step('cuestionario'));
      });
      expect(api.calls).toEqual(['initiative']);
      expect(api.profile?.initiativeId).toBe(INITIATIVE_ID);
    });

    it('con un consentimiento de un texto anterior registra la aceptación de ese texto al guardar', async () => {
      const api = backend({ initiatives: [initiativeSummaryFixture({ consentCurrent: false })] });
      const user = userEvent.setup();

      renderWizard();
      await openForm(user);
      await screen.findByDisplayValue('AgroConecta');
      expect(api.calls).toEqual([]);
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      await waitFor(() => {
        expect(where()).toBe(step('cuestionario'));
      });
      expect(api.calls).toEqual(['consent', 'initiative']);
      expect(api.profile?.initiativeId).toBe(INITIATIVE_ID);
    });
  });

  describe('reanudar un diagnóstico', () => {
    it('con la información de la iniciativa ya registrada va al cuestionario', async () => {
      backend({ initiatives: [initiativeSummaryFixture()], profile: initiativeFixture() });

      renderWizard();

      expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
        'Cuestionario IRL',
      );
      expect(where()).toBe(step('cuestionario'));
    });

    it('con el borrador de una iniciativa que ya aceptó el texto vigente, ofrece guardarla', async () => {
      const api = backend({ initiatives: [initiativeSummaryFixture()] });
      useInitiativeDraftStore.getState().initialize(ID);
      useInitiativeDraftStore.getState().acceptTerms('v1');
      useInitiativeDraftStore.getState().save({ initiativeId: INITIATIVE_ID, command: COMMAND });
      const user = userEvent.setup();

      renderWizard();

      expect(await screen.findByLabelText('Nombre de la iniciativa')).toHaveValue('AgroConecta');
      await user.click(screen.getByRole('button', { name: 'Continuar' }));
      await waitFor(() => {
        expect(where()).toBe(step('cuestionario'));
      });
      expect(api.calls).toEqual(['initiative']);
    });

    it('permite volver a corregir la información ya registrada y la guarda en el acto', async () => {
      const api = backend({
        initiatives: [initiativeSummaryFixture()],
        profile: initiativeFixture(),
      });
      const user = userEvent.setup();

      renderWizard(step('iniciativa'));
      const name = await screen.findByLabelText('Nombre de la iniciativa');
      await waitFor(() => {
        expect(name).toHaveValue('AgroConecta');
      });
      // The initiative of a registered profile is fixed: nothing to choose.
      expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
      await user.clear(name);
      await user.type(name, 'AgroConecta v2');
      await user.click(screen.getByRole('button', { name: 'Continuar' }));

      await waitFor(() => {
        expect(where()).toBe(step('cuestionario'));
      });
      expect(api.calls).toEqual(['initiative']);
      expect(api.profile?.name).toBe('AgroConecta v2');
    });
  });

  describe('navegación entre pasos', () => {
    it('los pasos anteriores son enlaces; el actual y los siguientes no', async () => {
      backend({ initiatives: [initiativeSummaryFixture()], profile: initiativeFixture() });

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
      backend({ initiatives: [initiativeSummaryFixture()], profile: initiativeFixture() });
      const user = userEvent.setup();

      renderWizard();
      await screen.findByRole('heading', { level: 1, name: 'Cuestionario IRL' });
      await user.click(
        within(screen.getByRole('navigation', { name: 'Pasos del diagnóstico' })).getByRole(
          'link',
          {
            name: /Consentimiento/,
          },
        ),
      );

      expect(await screen.findByText(/Ya aceptaste este texto/)).toBeInTheDocument();
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
      backend({ initiatives: [initiativeSummaryFixture()], profile: initiativeFixture() });

      renderWizard();

      await screen.findByRole('tablist', { name: 'Dimensiones IRL' });
      expect(scrollIntoView).not.toHaveBeenCalled();
      expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
      expect(
        screen.getByRole('heading', { level: 1, name: 'Cuestionario IRL' }),
      ).toBeInTheDocument();
    });

    it('sigue volviendo hacia arriba al cambiar de dimensión', async () => {
      backend({ initiatives: [initiativeSummaryFixture()], profile: initiativeFixture() });
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
      server.use(mswHttp.get('*/initiatives', () => new Promise(() => undefined)));
      server.use(mswHttp.get('*/diagnostics/:id/initiative', () => new Promise(() => undefined)));

      renderWizard();

      expect(screen.getByText('Cargando tu diagnóstico…')).toBeInTheDocument();
    });

    it('avisa si no se pudo abrir el diagnóstico', async () => {
      backend();
      server.use(
        mswHttp.get('*/diagnostics/:id', () =>
          HttpResponse.json({ message: 'x' }, { status: 500 }),
        ),
      );

      renderWizard();

      expect(await screen.findByText('No fue posible abrir tu diagnóstico')).toBeInTheDocument();
    });
  });
});
