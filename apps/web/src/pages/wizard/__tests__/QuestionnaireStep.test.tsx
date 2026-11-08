import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/render-with-client';
import { DIMENSION_CODES, questionnaireFixture } from '@/test/fixtures/questionnaire';
import { useQuestionnaireDraftStore } from '@features/questionnaire';
import type * as QuestionnaireModule from '@features/questionnaire';
import { QuestionnaireStep } from '../QuestionnaireStep';

const DIAG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const ADVANCE = 'Revisar resumen';

// The view of the 48 statements is not under test here; the step's own rules are.
vi.mock('@features/questionnaire', async (importOriginal) => ({
  ...(await importOriginal<typeof QuestionnaireModule>()),
  QuestionnaireView: () => null,
}));

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderStep(): ReturnType<typeof render> {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/diagnosticos/${DIAG_ID}/asistente/cuestionario`]}>
        <Routes>
          <Route
            path="/diagnosticos/:id/asistente/cuestionario"
            element={
              <QuestionnaireStep
                diagnosticId={DIAG_ID}
                frameworkVersion="KTH-IRL-1.0"
                saveStatus={{ kind: 'idle' }}
              />
            }
          />
          <Route path="/diagnosticos/:id/asistente/resumen" element={<div>RESUMEN_STUB</div>} />
          <Route
            path="/diagnosticos/:id/asistente/iniciativa"
            element={<div>INICIATIVA_STUB</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** A statement is complete with its answer and its justification. */
function complete(statementId: string): void {
  useQuestionnaireDraftStore.getState().setAnswer(statementId, 3);
  useQuestionnaireDraftStore.getState().setJustification(statementId, `Porque sí ${statementId}`);
}

function populate(statementIds: string[]): void {
  useQuestionnaireDraftStore.getState().initialize(DIAG_ID);
  for (const id of statementIds) complete(id);
}

const range = (from: number, to: number): string[] =>
  Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

describe('QuestionnaireStep — completeness validation (RF-06)', () => {
  beforeEach(() => {
    useQuestionnaireDraftStore.getState().clear();
    sessionStorage.clear();
    server.use(
      mswHttp.get('*/api/v1/catalog/questionnaire', () =>
        HttpResponse.json(questionnaireFixture()),
      ),
    );
  });

  describe('Escenario: cuestionario incompleto', () => {
    it('no ofrece «Revisar resumen» y dice cuántas afirmaciones faltan', async () => {
      populate(range(1, 4));
      renderStep();

      await screen.findByText(/Faltan 44 afirmaciones por responder/);
      expect(screen.queryByRole('button', { name: ADVANCE })).not.toBeInTheDocument();
      expect(screen.queryByText('RESUMEN_STUB')).not.toBeInTheDocument();
    });

    it('lists every dimension that has gaps, with its progress', async () => {
      renderStep();

      await screen.findByText(/Faltan \d+ afirmaciones/);
      const pending = screen.getByRole('list', {
        name: 'Dimensiones con afirmaciones pendientes',
      });
      for (const code of DIMENSION_CODES) expect(pending).toHaveTextContent(code);
      expect(pending).toHaveTextContent('0/8');
    });

    it('shows partial progress inside a dimension and omits completed ones', async () => {
      populate([...range(1, 8), ...range(9, 12)]);
      renderStep();

      await screen.findByText(/Faltan \d+ afirmaciones/);
      const pending = screen.getByRole('list', {
        name: 'Dimensiones con afirmaciones pendientes',
      });
      expect(pending).not.toHaveTextContent('TRL');
      expect(pending).toHaveTextContent('4/8');
      for (const code of ['CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'])
        expect(pending).toHaveTextContent(code);
    });

    it('each pending dimension opens it', async () => {
      populate(range(1, 8));
      const user = userEvent.setup();
      renderStep();

      await user.click(await screen.findByRole('button', { name: /^CRL — / }));

      expect(useQuestionnaireDraftStore.getState().activeTab).toBe('CRL');
    });

    it('updates while answering, and enables the summary when nothing is missing', async () => {
      populate(range(17, 48));
      renderStep();

      expect(await screen.findByText(/Faltan 16 afirmaciones/)).toBeInTheDocument();
      act(() => {
        for (const id of range(1, 8)) complete(id);
      });
      expect(screen.getByText(/Faltan 8 afirmaciones/)).toBeInTheDocument();
      act(() => {
        for (const id of range(9, 16)) complete(id);
      });
      expect(await screen.findByRole('button', { name: ADVANCE })).toBeEnabled();
    });

    it('before the first answer, says the questionnaire started, how long it is and that it saves itself', async () => {
      renderStep();

      expect(
        await screen.findByRole('heading', { name: 'Empieza el cuestionario' }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Son 48 afirmaciones, 8 por cada una de las 6 dimensiones/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Tus respuestas se guardan solas/)).toBeInTheDocument();
    });

    it('with answers already given, the notice is gone', async () => {
      populate(range(1, 2));
      renderStep();

      await screen.findByText(/Faltan 46 afirmaciones/);
      expect(
        screen.queryByRole('heading', { name: 'Empieza el cuestionario' }),
      ).not.toBeInTheDocument();
    });

    it('the band in view says the answers save themselves and offers no way back to the summary yet', async () => {
      populate(range(1, 8));
      renderStep();

      const band = await screen.findByRole('region', { name: 'Progreso del cuestionario' });
      expect(band).toHaveTextContent('Se guarda automáticamente.');
      expect(screen.queryByRole('button', { name: /Volver al resumen/ })).not.toBeInTheDocument();
    });
  });

  describe('Escenario: cuestionario completo', () => {
    it('the footer says it is ready to review', async () => {
      populate(range(1, 48));
      renderStep();

      await screen.findByText(
        'Todas las afirmaciones están completas. Ya puedes revisar el resumen.',
      );
    });

    it('advancing opens the summary', async () => {
      populate(range(1, 48));
      const user = userEvent.setup();
      renderStep();

      await user.click(await screen.findByRole('button', { name: ADVANCE }));

      expect(await screen.findByText('RESUMEN_STUB')).toBeInTheDocument();
    });

    it('the band offers «Volver al resumen» from any statement', async () => {
      populate(range(1, 48));
      const user = userEvent.setup();
      renderStep();

      const band = await screen.findByRole('region', { name: 'Progreso del cuestionario' });
      await user.click(within(band).getByRole('button', { name: /Volver al resumen/ }));

      expect(await screen.findByText('RESUMEN_STUB')).toBeInTheDocument();
    });
  });

  // The justification of each answer is mandatory.
  describe('Escenario: justificación opcional', () => {
    it.each([
      ['empty', '', '3'],
      ['spaces only', '    ', '9'],
    ])('a statement with a %s justification still counts as complete', async (_l, text, id) => {
      populate(range(1, 48));
      act(() => {
        useQuestionnaireDraftStore.getState().setJustification(id, text);
      });
      const user = userEvent.setup();
      renderStep();

      await user.click(await screen.findByRole('button', { name: ADVANCE }));

      expect(await screen.findByText('RESUMEN_STUB')).toBeInTheDocument();
    });
  });

  it('nothing is sent to the server from this step: the draft stays in the browser', async () => {
    // No handler for any POST: an unhandled request would fail the suite.
    populate(range(1, 48));
    const user = userEvent.setup();
    renderStep();

    await user.click(await screen.findByRole('button', { name: ADVANCE }));

    expect(await screen.findByText('RESUMEN_STUB')).toBeInTheDocument();
  });

  it('«Atrás» goes back to the initiative step', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(await screen.findByRole('link', { name: 'Atrás' }));

    expect(screen.getByText('INICIATIVA_STUB')).toBeInTheDocument();
  });

  // The autofill exists only in development builds.
  it('no autofill button outside development: the switch is a build-time variable', () => {
    renderStep();

    expect(screen.queryByTestId('dev-autofill-questionnaire')).not.toBeInTheDocument();
  });
});
