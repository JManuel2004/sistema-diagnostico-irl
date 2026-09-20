import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/render-with-client';
import { DIMENSION_CODES, questionnaireFixture } from '@/test/fixtures/questionnaire';
import { useQuestionnaireDraftStore } from '@features/questionnaire';
import { QuestionnaireStep } from '../QuestionnaireStep';

const DIAG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const ADVANCE = 'Revisar resumen';

// The view of the 48 statements is not under test here; the step's own rules are.
vi.mock('@features/questionnaire', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@features/questionnaire')>()),
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
            element={<QuestionnaireStep diagnosticId={DIAG_ID} />}
          />
          <Route path="/diagnosticos/:id/asistente/resumen" element={<div>RESUMEN_STUB</div>} />
          <Route
            path="/diagnosticos/:id/asistente/consentimiento"
            element={<div>CONSENTIMIENTO_STUB</div>}
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
      mswHttp.get('*/api/v1/catalog/questionnaire', () => HttpResponse.json(questionnaireFixture())),
    );
  });

  describe('Escenario: cuestionario incompleto', () => {
    it('does not show the completeness alert before the user tries to advance', async () => {
      renderStep();

      await screen.findByRole('button', { name: ADVANCE });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('blocks the summary: advancing with unanswered statements shows the alert and stays', async () => {
      const user = userEvent.setup();
      renderStep();

      await user.click(await screen.findByRole('button', { name: ADVANCE }));

      expect(screen.getByRole('alert')).toHaveTextContent(
        'Hay afirmaciones sin completar. Cada una necesita su respuesta y su justificación antes de continuar.',
      );
      expect(screen.queryByText('RESUMEN_STUB')).not.toBeInTheDocument();
    });

    it('lists every dimension that has gaps, with its progress', async () => {
      const user = userEvent.setup();
      renderStep();

      await user.click(await screen.findByRole('button', { name: ADVANCE }));

      const alert = screen.getByRole('alert');
      for (const code of DIMENSION_CODES) expect(alert).toHaveTextContent(code);
      expect(alert).toHaveTextContent('(0/8)');
    });

    it('shows partial progress inside a dimension', async () => {
      populate(range(1, 4));
      const user = userEvent.setup();
      renderStep();

      await user.click(await screen.findByRole('button', { name: ADVANCE }));

      expect(screen.getByRole('alert')).toHaveTextContent('(4/8)');
    });

    it('omits completed dimensions from the list', async () => {
      populate(range(1, 8));
      const user = userEvent.setup();
      renderStep();

      await user.click(await screen.findByRole('button', { name: ADVANCE }));

      const alert = screen.getByRole('alert');
      expect(alert).not.toHaveTextContent('TRL');
      for (const code of ['CRL', 'BRL', 'IPRL', 'TmRL', 'FRL']) expect(alert).toHaveTextContent(code);
    });

    // Backlog 10.5: the warning used to disappear as soon as ANY answer changed.
    it('keeps the alert while something is still missing, and clears it when nothing is', async () => {
      const user = userEvent.setup();
      // Everything answered except the 8 statements of TRL and the 8 of CRL.
      populate(range(17, 48));
      renderStep();

      await user.click(await screen.findByRole('button', { name: ADVANCE }));
      expect(screen.getByRole('alert')).toHaveTextContent('TRL — Nombre');
      expect(screen.getByRole('alert')).toHaveTextContent('CRL — Nombre');

      act(() => {
        for (const id of range(1, 8)) complete(id);
      });
      expect(screen.getByRole('alert')).not.toHaveTextContent('TRL — Nombre');
      expect(screen.getByRole('alert')).toHaveTextContent('CRL — Nombre');

      act(() => {
        for (const id of range(9, 16)) complete(id);
      });
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('the footer says how many dimensions still have gaps', async () => {
      populate(range(1, 8));
      renderStep();

      await screen.findByText(/Faltan respuestas o justificaciones en 5 dimensión\(es\)/);
    });
  });

  describe('Escenario: cuestionario completo', () => {
    it('the footer says it is ready to review', async () => {
      populate(range(1, 48));
      renderStep();

      await screen.findByText('Todas las afirmaciones completas — listo para revisar.');
    });

    it('advancing opens the summary, without an alert', async () => {
      populate(range(1, 48));
      const user = userEvent.setup();
      renderStep();

      await user.click(await screen.findByRole('button', { name: ADVANCE }));

      expect(await screen.findByText('RESUMEN_STUB')).toBeInTheDocument();
    });
  });

  // Fase 8c, Oleada 1: the justification of each answer is mandatory.
  describe('Escenario: justificación obligatoria', () => {
    it.each([
      ['empty', '', '3', 'TRL — Nombre (7/8)'],
      ['spaces only', '    ', '9', 'CRL — Nombre (7/8)'],
    ])('a statement with a %s justification does not count as complete', async (_l, text, id, expected) => {
      populate(range(1, 48));
      act(() => {
        useQuestionnaireDraftStore.getState().setJustification(id, text);
      });
      const user = userEvent.setup();
      renderStep();

      await user.click(await screen.findByRole('button', { name: ADVANCE }));

      expect(screen.getByRole('alert')).toHaveTextContent(expected);
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Cada una necesita su respuesta y su justificación',
      );
      expect(screen.queryByText('RESUMEN_STUB')).not.toBeInTheDocument();
    });

    it('lets the user advance once the missing justification is written', async () => {
      populate(range(1, 48));
      act(() => {
        useQuestionnaireDraftStore.getState().setJustification('48', '');
      });
      const user = userEvent.setup();
      renderStep();

      await user.click(await screen.findByRole('button', { name: ADVANCE }));
      expect(screen.getByRole('alert')).toBeInTheDocument();

      act(() => {
        useQuestionnaireDraftStore.getState().setJustification('48', 'Ahora sí, con su razón.');
      });
      await user.click(screen.getByRole('button', { name: ADVANCE }));

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

  it('«Atrás» goes back to the consent step', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(await screen.findByRole('link', { name: 'Atrás' }));

    expect(screen.getByText('CONSENTIMIENTO_STUB')).toBeInTheDocument();
  });

  // Fase 8c, Oleada 8: the autofill exists only in development builds.
  it('no autofill button outside development: the switch is a build-time variable', () => {
    renderStep();

    expect(screen.queryByTestId('dev-autofill-questionnaire')).not.toBeInTheDocument();
  });
});
