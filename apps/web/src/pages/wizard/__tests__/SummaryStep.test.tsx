import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { toast } from 'sonner';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/render-with-client';
import { DIMENSION_CODES, questionnaireFixture } from '@/test/fixtures/questionnaire';
import { dimensionResultFixture } from '@/test/fixtures/dimensions';
import { initiativeFixture } from '@/test/fixtures/initiative';
import { useQuestionnaireDraftStore } from '@features/questionnaire';
import { SummaryStep } from '../SummaryStep';

const DIAG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function profile(): Record<string, unknown> {
  return {
    diagnosticId: DIAG_ID,
    computedAt: '2026-01-01T00:00:00.000Z',
    globalAverage: 6,
    dimensionResults: DIMENSION_CODES.map((code) => dimensionResultFixture(code, 6)),
    bottleneck: { dimensions: ['TRL'], level: 6 },
    strength: { dimensions: ['TRL'], level: 6 },
    asymmetry: { difference: 0, classification: 'acceptable' },
    gaps: { dimensions: [], threshold: 3 },
    criticalState: { dimensions: [] },
  };
}

function renderStep(): ReturnType<typeof render> {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[`/diagnosticos/${DIAG_ID}/asistente/resumen`]}>
        <Routes>
          <Route
            path="/diagnosticos/:id/asistente/resumen"
            element={<SummaryStep diagnosticId={DIAG_ID} />}
          />
          <Route
            path="/diagnosticos/:id/asistente/cuestionario"
            element={<div>CUESTIONARIO_STUB</div>}
          />
          <Route path="/diagnosticos/:id/asistente/iniciativa" element={<div>INICIATIVA_STUB</div>} />
          <Route path="/diagnosticos/:id/resultados" element={<div>RESULTADOS_STUB</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function fill(count = 48): void {
  useQuestionnaireDraftStore.getState().initialize(DIAG_ID);
  for (let id = 1; id <= count; id += 1) {
    useQuestionnaireDraftStore.getState().setAnswer(String(id), ((id % 5) + 1));
    useQuestionnaireDraftStore.getState().setJustification(String(id), `Porque sí ${String(id)}`);
  }
}

function withBackend(): void {
  server.use(
    mswHttp.get('*/api/v1/catalog/questionnaire', () => HttpResponse.json(questionnaireFixture())),
    mswHttp.get(`*/api/v1/diagnostics/${DIAG_ID}/initiative`, () =>
      HttpResponse.json(initiativeFixture()),
    ),
    mswHttp.get(`*/api/v1/diagnostics/${DIAG_ID}`, () =>
      HttpResponse.json({
        id: DIAG_ID,
        userId: 'user-1',
        state: 'PROFILE_GENERATED',
        completed: true,
        deepAnalysisAccepted: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    ),
    mswHttp.get('*/api/v1/diagnostics', () => HttpResponse.json([])),
  );
}

describe('SummaryStep — resumen antes de procesar', () => {
  beforeEach(() => {
    useQuestionnaireDraftStore.getState().clear();
    sessionStorage.clear();
    withBackend();
  });

  describe('la iniciativa', () => {
    it('resume la iniciativa antes de las respuestas, con su nombre, sector y datos', async () => {
      fill();
      renderStep();

      expect(await screen.findByRole('heading', { name: 'AgroConecta' })).toBeInTheDocument();
      expect(screen.getByText('Agroindustria / AgriTech')).toBeInTheDocument();
      expect(screen.getByText(/Aplicación web y módulo de trazabilidad/)).toBeInTheDocument();
      expect(screen.getByText(/Fundadora, coordinadora/)).toBeInTheDocument();
      // The initiative comes before the answers in the page.
      const initiative = screen.getByRole('heading', { name: 'AgroConecta' });
      const answers = screen.getByRole('heading', { name: 'Tus respuestas' });
      expect(
        initiative.compareDocumentPosition(answers) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it('permite volver a corregirla', async () => {
      const user = userEvent.setup();
      fill();
      renderStep();

      await user.click(await screen.findByRole('link', { name: 'Corregir iniciativa' }));

      expect(screen.getByText('INICIATIVA_STUB')).toBeInTheDocument();
    });

    it('si no se puede cargar, avisa pero deja procesar el diagnóstico', async () => {
      server.use(
        mswHttp.get(`*/api/v1/diagnostics/${DIAG_ID}/initiative`, () =>
          HttpResponse.json({ message: 'x' }, { status: 500 }),
        ),
      );
      fill();
      renderStep();

      expect(await screen.findByText('No fue posible cargar tu iniciativa')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Procesar diagnóstico' })).toBeEnabled();
    });
  });

  describe('el color de la tabla', () => {
    it('cada dimensión usa su color en la pestaña y en la cabecera de su tabla', async () => {
      fill();
      renderStep();

      const table = await screen.findByRole('table', { name: /Respuestas de TRL/ });
      const box = table.parentElement!;
      expect(box.className).toContain('border-dimension-trl');
      expect(screen.getByRole('tab', { name: 'TRL' }).className).toContain(
        'data-[state=active]:border-dimension-trl',
      );
    });

    it('cambia de color al cambiar de dimensión', async () => {
      const user = userEvent.setup();
      fill();
      renderStep();

      await user.click(await screen.findByRole('tab', { name: 'CRL' }));

      const table = await screen.findByRole('table', { name: /Respuestas de CRL/ });
      expect(table.parentElement!.className).toContain('border-dimension-crl');
    });

    it('el puntaje va con una barra de cinco tramos, además del texto', async () => {
      fill();
      renderStep();

      const table = await screen.findByRole('table', { name: /Respuestas de TRL/ });
      const rows = within(table).getAllByRole('row').slice(1);
      // Statement 1: value 2 of 5.
      expect(within(rows[0]).getByRole('img', { name: 'Nivel 2 de 5' })).toBeInTheDocument();
      expect(within(rows[0]).getByText('2 — En desacuerdo')).toBeInTheDocument();
    });

    it('el texto de la tabla es de lectura: no baja de text-sm', async () => {
      fill();
      renderStep();

      const table = await screen.findByRole('table', { name: /Respuestas de TRL/ });
      expect(table.parentElement!.innerHTML).not.toContain('text-xs');
    });
  });

  describe('la tabla de respuestas', () => {
    it('tiene las columnas Afirmación, Puntaje seleccionado y Justificación', async () => {
      fill();
      renderStep();

      const table = await screen.findByRole('table', { name: /Respuestas de TRL/ });
      const headers = within(table).getAllByRole('columnheader');
      expect(headers.map((h) => h.textContent)).toEqual([
        'Afirmación',
        'Puntaje seleccionado',
        'Justificación',
      ]);
    });

    it('lista las 8 afirmaciones de la dimensión con su puntaje y su justificación', async () => {
      fill();
      renderStep();

      const table = await screen.findByRole('table', { name: /Respuestas de TRL/ });
      const rows = within(table).getAllByRole('row').slice(1);
      expect(rows).toHaveLength(8);
      // Statement 1: value (1 % 5) + 1 = 2.
      expect(within(rows[0]).getByText('Afirmación 1 de TRL')).toBeInTheDocument();
      expect(within(rows[0]).getByText('2 — En desacuerdo')).toBeInTheDocument();
      expect(within(rows[0]).getByText('Porque sí 1')).toBeInTheDocument();
    });

    it('recorre las seis dimensiones por pestañas, sin apilar las seis tablas', async () => {
      const user = userEvent.setup();
      fill();
      renderStep();

      await screen.findByRole('table', { name: /Respuestas de TRL/ });
      const tabs = screen.getAllByRole('tab');
      expect(tabs.map((t) => t.textContent)).toEqual([...DIMENSION_CODES]);
      // Only the active dimension's table is in the page.
      expect(screen.getAllByRole('table')).toHaveLength(1);

      await user.click(screen.getByRole('tab', { name: 'BRL' }));

      const brl = await screen.findByRole('table', { name: /Respuestas de BRL/ });
      expect(within(brl).getByText('Afirmación 1 de BRL')).toBeInTheDocument();
      expect(within(brl).getByText('Porque sí 17')).toBeInTheDocument();
      expect(screen.getAllByRole('table')).toHaveLength(1);
    });
  });

  describe('procesar el diagnóstico', () => {
    it('envía las 48 respuestas, cada una con su justificación, y abre los resultados', async () => {
      let body: { answers: { statementId: string; value: number; justification: string }[] } | undefined;
      server.use(
        mswHttp.post(`*/api/v1/diagnostics/${DIAG_ID}/finalize-initial`, async ({ request }) => {
          body = (await request.json()) as typeof body;
          return HttpResponse.json(profile(), { status: 201 });
        }),
      );
      const user = userEvent.setup();
      fill();
      renderStep();

      await user.click(await screen.findByRole('button', { name: 'Procesar diagnóstico' }));

      expect(await screen.findByText('RESULTADOS_STUB')).toBeInTheDocument();
      expect(body?.answers).toHaveLength(48);
      expect(body?.answers.every((a) => a.justification === `Porque sí ${a.statementId}`)).toBe(true);
    });

    it('muestra «Procesando…» y bloquea el botón mientras espera', async () => {
      let release!: () => void;
      server.use(
        mswHttp.post(
          `*/api/v1/diagnostics/${DIAG_ID}/finalize-initial`,
          () =>
            new Promise<Response>((resolve) => {
              release = () => {
                resolve(HttpResponse.json(profile(), { status: 201 }));
              };
            }),
        ),
      );
      const user = userEvent.setup();
      fill();
      renderStep();

      await user.click(await screen.findByRole('button', { name: 'Procesar diagnóstico' }));

      expect(await screen.findByRole('button', { name: 'Procesando…' })).toBeDisabled();
      await act(async () => {
        release();
        await Promise.resolve();
      });
      await waitFor(() => screen.getByText('RESULTADOS_STUB'));
    });

    it('avisa si el servidor falla y no abre los resultados', async () => {
      server.use(
        mswHttp.post(`*/api/v1/diagnostics/${DIAG_ID}/finalize-initial`, () =>
          HttpResponse.json({ message: 'boom' }, { status: 500 }),
        ),
      );
      const user = userEvent.setup();
      fill();
      renderStep();

      await user.click(await screen.findByRole('button', { name: 'Procesar diagnóstico' }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'No fue posible generar el diagnóstico. Intenta de nuevo en unos minutos.',
        );
      });
      expect(screen.queryByText('RESULTADOS_STUB')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Procesar diagnóstico' })).toBeEnabled();
    });
  });

  it('«Volver al cuestionario» permite corregir las respuestas', async () => {
    const user = userEvent.setup();
    fill();
    renderStep();

    await user.click(await screen.findByRole('link', { name: 'Volver al cuestionario' }));

    expect(screen.getByText('CUESTIONARIO_STUB')).toBeInTheDocument();
  });

  it('no se puede ver con respuestas faltantes: vuelve al cuestionario', async () => {
    fill(47);
    renderStep();

    expect(await screen.findByText('CUESTIONARIO_STUB')).toBeInTheDocument();
  });
});
