import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QuestionnaireStructure } from '@innlab/contracts';
import { createTestQueryClient } from '../../test/render-with-client';
import { useQuestionnaireDraftStore } from '../../features/questionnaire/store/questionnaire-draft.store';
import QuestionnairePage from '../QuestionnairePage';

const DIAG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const DIMENSION_CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

vi.mock('@features/questionnaire', () => ({
  QuestionnaireView: () => null,
}));

function buildCatalogFixture(): QuestionnaireStructure {
  return {
    versionMarco: 'KTH-IRL-1.0',
    dimensions: DIMENSION_CODES.map((code, dimIdx) => ({
      code,
      name: `${code} — Nombre`,
      description: `Descripción de ${code}`,
      sequence: dimIdx + 1,
      statements: Array.from({ length: 8 }, (_, i) => ({
        id: String(dimIdx * 8 + i + 1),
        dimensionCode: code,
        sequence: i + 1,
        text: `Afirmación ${i + 1} de ${code}`,
      })),
    })),
  };
}

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function withCatalog(): void {
  server.use(
    mswHttp.get('http://localhost/api/v1/catalogo/cuestionario', () =>
      HttpResponse.json(buildCatalogFixture()),
    ),
  );
}

function buildProfileFixture(): unknown {
  return {
    diagnosticId: DIAG_ID,
    computedAt: '2026-01-01T00:00:00.000Z',
    dimensionResults: DIMENSION_CODES.map((code) => ({
      dimensionCode: code,
      name: `${code} — Nombre`,
      averageLikert: 3,
      irlLevel: 6,
    })),
  };
}

function withProfileComputeSuccess(): void {
  server.use(
    mswHttp.post(`http://localhost/api/v1/diagnosticos/${DIAG_ID}/perfil`, () =>
      HttpResponse.json(buildProfileFixture(), { status: 201 }),
    ),
  );
}

function withSubmitSuccess(answersRecorded = 48): void {
  server.use(
    mswHttp.post(`http://localhost/api/v1/diagnosticos/${DIAG_ID}/cuestionario`, () =>
      HttpResponse.json(
        { diagnosticId: DIAG_ID, answersRecorded, state: 'CUESTIONARIO_COMPLETO' },
        { status: 201 },
      ),
    ),
  );
  withProfileComputeSuccess();
}

function withSubmitError(): void {
  server.use(
    mswHttp.post(`http://localhost/api/v1/diagnosticos/${DIAG_ID}/cuestionario`, () =>
      HttpResponse.json({ message: 'Internal server error' }, { status: 500 }),
    ),
  );
}

const PROFILE_ROUTE_MARKER = 'PERFIL_ROUTE_STUB';

function renderPage(): ReturnType<typeof render> {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/diagnosticos/${DIAG_ID}/cuestionario`]}>
        <Routes>
          <Route path="/diagnosticos/:id/cuestionario" element={<QuestionnairePage />} />
          <Route path="/diagnosticos/:id/perfil" element={<div>{PROFILE_ROUTE_MARKER}</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function populateAnswers(statementIds: string[]): void {
  useQuestionnaireDraftStore.getState().initialize(DIAG_ID);
  for (const id of statementIds) {
    useQuestionnaireDraftStore.getState().setAnswer(id, 3);
  }
}

function populateAllAnswers(): void {
  populateAnswers(Array.from({ length: 48 }, (_, i) => String(i + 1)));
}

describe('QuestionnairePage — completeness validation (RF-06)', () => {
  beforeEach(() => {
    useQuestionnaireDraftStore.getState().clear();
    sessionStorage.clear();
    withCatalog();
  });

  describe('Escenario: Cuestionario incompleto', () => {
    it('does not show the completeness alert before the user presses submit', async () => {
      renderPage();

      await waitFor(() => screen.getByRole('button', { name: 'Procesar diagnóstico' }));

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('blocks processing: clicking submit with unanswered statements shows the completeness alert', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByRole('button', { name: 'Procesar diagnóstico' }));
      await user.click(screen.getByRole('button', { name: 'Procesar diagnóstico' }));

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(
        'Hay secciones sin completar. Responde todas las afirmaciones antes de continuar.',
      );
    });

    it('signals incomplete sections: alert lists every dimension that has gaps', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByRole('button', { name: 'Procesar diagnóstico' }));
      await user.click(screen.getByRole('button', { name: 'Procesar diagnóstico' }));

      const alert = screen.getByRole('alert');
      for (const code of DIMENSION_CODES) {
        expect(alert).toHaveTextContent(code);
      }
    });

    it('shows the answered/8 progress for each incomplete dimension', async () => {
      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByRole('button', { name: 'Procesar diagnóstico' }));
      await user.click(screen.getByRole('button', { name: 'Procesar diagnóstico' }));

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('(0/8)');
    });

    it('shows partial progress when some statements inside a dimension are answered', async () => {
      populateAnswers(['1', '2', '3', '4']);

      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByRole('button', { name: 'Procesar diagnóstico' }));
      await user.click(screen.getByRole('button', { name: 'Procesar diagnóstico' }));

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('(4/8)');
    });

    it('omits completed dimensions from the alert list', async () => {
      populateAnswers(Array.from({ length: 8 }, (_, i) => String(i + 1)));

      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByRole('button', { name: 'Procesar diagnóstico' }));
      await user.click(screen.getByRole('button', { name: 'Procesar diagnóstico' }));

      const alert = screen.getByRole('alert');
      expect(alert).not.toHaveTextContent('TRL');
      for (const code of ['CRL', 'BRL', 'IPRL', 'TmRL', 'FRL']) {
        expect(alert).toHaveTextContent(code);
      }
    });

    it('does NOT call the submission API when the questionnaire is incomplete', async () => {
      let postCalled = false;
      server.use(
        mswHttp.post(`http://localhost/api/v1/diagnosticos/${DIAG_ID}/cuestionario`, () => {
          postCalled = true;
          return HttpResponse.json({});
        }),
      );

      const user = userEvent.setup();
      renderPage();

      await waitFor(() => screen.getByRole('button', { name: 'Procesar diagnóstico' }));
      await user.click(screen.getByRole('button', { name: 'Procesar diagnóstico' }));

      await waitFor(() => screen.getByRole('alert'));
      expect(postCalled).toBe(false);
    });

    it('footer shows how many dimensions still have gaps', async () => {
      renderPage();

      await waitFor(() => screen.getByText(/Faltan respuestas en 6 dimensión\(es\)/));
    });

    it('footer updates the count as dimensions are completed', async () => {
      populateAnswers(Array.from({ length: 8 }, (_, i) => String(i + 1)));

      renderPage();

      await waitFor(() => screen.getByText(/Faltan respuestas en 5 dimensión\(es\)/));
    });
  });

  describe('Escenario: Cuestionario completo', () => {
    it('footer shows "Todas las afirmaciones respondidas" when all 48 are answered', async () => {
      populateAllAnswers();
      renderPage();

      await waitFor(() =>
        screen.getByText('Todas las afirmaciones respondidas — listo para procesar.'),
      );
    });

    it('does not show the completeness alert when all 48 answers are present', async () => {
      withSubmitSuccess();
      populateAllAnswers();

      const user = userEvent.setup();
      renderPage();

      await waitFor(() =>
        screen.getByText('Todas las afirmaciones respondidas — listo para procesar.'),
      );
      await user.click(screen.getByRole('button', { name: 'Procesar diagnóstico' }));

      await waitFor(() => screen.getByText(PROFILE_ROUTE_MARKER));
      expect(screen.queryByText('Hay secciones sin completar')).not.toBeInTheDocument();
    });

    it('transmits all 48 answers to the server when the questionnaire is complete', async () => {
      let capturedBody: { answers: unknown[] } | undefined;
      server.use(
        mswHttp.post(
          `http://localhost/api/v1/diagnosticos/${DIAG_ID}/cuestionario`,
          async ({ request }) => {
            capturedBody = (await request.json()) as { answers: unknown[] };
            return HttpResponse.json(
              { diagnosticId: DIAG_ID, answersRecorded: 48, state: 'CUESTIONARIO_COMPLETO' },
              { status: 201 },
            );
          },
        ),
      );
      withProfileComputeSuccess();
      populateAllAnswers();

      const user = userEvent.setup();
      renderPage();

      await waitFor(() =>
        screen.getByText('Todas las afirmaciones respondidas — listo para procesar.'),
      );
      await user.click(screen.getByRole('button', { name: 'Procesar diagnóstico' }));

      await waitFor(() => screen.getByText(PROFILE_ROUTE_MARKER));
      expect(capturedBody?.answers).toHaveLength(48);
    });

    it('navigates to the profile route after a successful submission', async () => {
      withSubmitSuccess(48);
      populateAllAnswers();

      const user = userEvent.setup();
      renderPage();

      await waitFor(() =>
        screen.getByText('Todas las afirmaciones respondidas — listo para procesar.'),
      );
      await user.click(screen.getByRole('button', { name: 'Procesar diagnóstico' }));

      await waitFor(() => screen.getByText(PROFILE_ROUTE_MARKER));
    });

    it('chain completes even when the server records fewer answers than expected', async () => {
      withSubmitSuccess(45);
      populateAllAnswers();

      const user = userEvent.setup();
      renderPage();

      await waitFor(() =>
        screen.getByText('Todas las afirmaciones respondidas — listo para procesar.'),
      );
      await user.click(screen.getByRole('button', { name: 'Procesar diagnóstico' }));

      await waitFor(() => screen.getByText(PROFILE_ROUTE_MARKER));
    });

    it('button shows "Procesando..." while the mutation is in flight', async () => {
      let resolveSubmit!: () => void;
      server.use(
        mswHttp.post(
          `http://localhost/api/v1/diagnosticos/${DIAG_ID}/cuestionario`,
          () =>
            new Promise<Response>((resolve) => {
              resolveSubmit = () =>
                resolve(
                  HttpResponse.json(
                    { diagnosticId: DIAG_ID, answersRecorded: 48, state: 'CUESTIONARIO_COMPLETO' },
                    { status: 201 },
                  ),
                );
            }),
        ),
      );
      withProfileComputeSuccess();
      populateAllAnswers();

      const user = userEvent.setup();
      renderPage();

      await waitFor(() =>
        screen.getByText('Todas las afirmaciones respondidas — listo para procesar.'),
      );
      await user.click(screen.getByRole('button', { name: 'Procesar diagnóstico' }));

      await waitFor(() => screen.getByRole('button', { name: 'Procesando…' }));

      await act(async () => {
        resolveSubmit();
        await Promise.resolve();
      });
    });
  });

  describe('Error handling', () => {
    it('shows a server error alert when the submission API returns an error', async () => {
      withSubmitError();
      populateAllAnswers();

      const user = userEvent.setup();
      renderPage();

      await waitFor(() =>
        screen.getByText('Todas las afirmaciones respondidas — listo para procesar.'),
      );
      await user.click(screen.getByRole('button', { name: 'Procesar diagnóstico' }));

      await waitFor(() =>
        screen.getByText(
          'No fue posible generar el diagnóstico. Intenta de nuevo en unos minutos.',
        ),
      );
    });
  });
});
