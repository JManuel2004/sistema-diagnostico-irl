import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import userEvent from '@testing-library/user-event';
import { screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import ReportPage from '../ReportPage';
import { renderWithClient } from '@/test/render-with-client';
import { agroconectaReportFixture } from '@/test/fixtures/report';
import { questionnaireFixture } from '@/test/fixtures/questionnaire';

const ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function diagnostic(deepAnalysisCompleted: boolean) {
  return {
    id: ID,
    userId: 'user-1',
    state: deepAnalysisCompleted ? 'DEEP_ANALYSIS_COMPLETE' : 'PROFILE_GENERATED',
    completed: true,
    deepAnalysisAccepted: deepAnalysisCompleted,
    deepAnalysisCompleted,
    createdAt: '2026-03-01T00:00:00.000Z',
    frameworkVersion: 'KTH-IRL-1.0',
  };
}

function problem(code: string, status: number) {
  return HttpResponse.json(
    { type: 'about:blank', title: code, status, detail: code, code },
    { status },
  );
}

/** Backend handlers; `requests.report` counts the calls to the report. */
function backend(opts: { completed: boolean; report?: 'ok' | 'not-available' }) {
  const requests = { report: 0 };
  server.use(
    mswHttp.get('*/diagnostics/:id', () => HttpResponse.json(diagnostic(opts.completed))),
    // What each dimension measures, for the radar tooltips and the alerts.
    mswHttp.get('*/api/v1/catalog/questionnaire', () => HttpResponse.json(questionnaireFixture())),
    mswHttp.get('*/diagnostics/:id/report', () => {
      requests.report += 1;
      return opts.report === 'not-available'
        ? problem('REPORT_NOT_AVAILABLE', 409)
        : HttpResponse.json(agroconectaReportFixture());
    }),
  );
  return requests;
}

function renderPage() {
  return renderWithClient(
    <MemoryRouter initialEntries={[`/diagnosticos/${ID}/reporte`]}>
      <Routes>
        <Route path="/diagnosticos/:id/reporte" element={<ReportPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ReportPage — con el análisis profundo completo', () => {
  it('se titula con el nombre de la iniciativa y dice cuándo se completó el análisis', async () => {
    backend({ completed: true });

    renderPage();

    // The page asks the diagnostic first and the report after it: two
    // requests in a row, so the first test of the file gets more time.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'AgroConecta' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Análisis profundo completado el/)).toBeInTheDocument();
  });

  it('muestra los datos de la iniciativa', async () => {
    backend({ completed: true });

    renderPage();

    const section = await screen.findByRole('region', { name: 'Datos de la iniciativa' });
    expect(within(section).getByText('Agroindustria / AgriTech')).toBeInTheDocument();
    expect(within(section).getByText('Productores de café del suroccidente')).toBeInTheDocument();
    expect(within(section).getByText('Ahorros de la fundadora')).toBeInTheDocument();
  });

  it('muestra el perfil de las seis dimensiones, con el nivel y lo que significa', async () => {
    backend({ completed: true });

    renderPage();

    const section = await screen.findByRole('region', { name: 'Perfil de seis dimensiones' });
    const levels = within(section).getByRole('list', { name: 'Nivel de cada dimensión' });
    expect(within(levels).getAllByRole('listitem')).toHaveLength(6);
    expect(within(levels).getByText('Nivel de Madurez Tecnológica')).toBeInTheDocument();
    expect(within(section).getByText('Nivel IRL global')).toBeInTheDocument();
  });

  it('el perfil lleva el mismo radar interactivo de los resultados', async () => {
    backend({ completed: true });

    renderPage();

    const section = await screen.findByRole('region', { name: 'Perfil de seis dimensiones' });
    expect(
      within(section).getByRole('group', { name: 'Perfil IRL — gráfico radar' }),
    ).toBeInTheDocument();
  });

  it('muestra las brechas, las alertas de estado crítico y los desequilibrios, los más graves primero', async () => {
    backend({ completed: true });

    renderPage();

    const section = await screen.findByRole('region', {
      name: 'Brechas, alertas y desequilibrios',
    });
    expect(
      within(section).getByRole('region', { name: 'Qué tan parejo avanza AgroConecta' }),
    ).toBeInTheDocument();
    expect(
      within(section).getByRole('article', { name: 'Negocio está en estado crítico' }),
    ).toBeInTheDocument();
  });

  it('muestra la recomendación del portafolio con su justificación', async () => {
    backend({ completed: true });

    renderPage();

    const section = await screen.findByRole('region', {
      name: 'Recomendación del portafolio INNLAB',
    });
    expect(within(section).getByRole('heading', { name: 'Reto Express' })).toBeInTheDocument();
    expect(within(section).getByText(/Atiende primero a Negocio/)).toBeInTheDocument();
  });

  it('muestra el roadmap por fases, cada una con su servicio', async () => {
    backend({ completed: true });

    renderPage();

    const section = await screen.findByRole('region', { name: 'Roadmap de escalamiento' });
    expect(within(section).getByRole('heading', { name: 'Fase 1' })).toBeInTheDocument();
    expect(within(section).getByRole('heading', { name: 'Fase 3' })).toBeInTheDocument();
    expect(within(section).getByText('Al terminar la ruta')).toBeInTheDocument();
  });

  it('lleva la atribución al marco KTH Innovation Readiness Level y su licencia', async () => {
    backend({ completed: true });

    renderPage();

    const section = await screen.findByRole('region', { name: 'Marco de referencia' });
    expect(within(section).getByText(/KTH Innovation Readiness Level/)).toBeInTheDocument();
    expect(
      within(section).getByText('Marco IRL © KTH Innovation. Licencia CC BY-NC-SA 4.0.'),
    ).toBeInTheDocument();
    expect(within(section).getByRole('link', { name: /CC BY-NC-SA 4.0/ })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    );
  });

  it('ofrece volver a los resultados', async () => {
    backend({ completed: true });

    renderPage();

    expect(await screen.findByRole('link', { name: 'Volver a los resultados' })).toHaveAttribute(
      'href',
      `/diagnosticos/${ID}/resultados`,
    );
  });
});

describe('ReportPage — las respuestas al cuestionario', () => {
  it('muestra las 48 respuestas de un vistazo, cada casilla con su valor', async () => {
    backend({ completed: true });

    renderPage();

    const section = await screen.findByRole('region', { name: 'Respuestas al cuestionario' });
    const grid = within(section).getByRole('table');
    const cells = within(grid).getAllByRole('button');
    expect(cells).toHaveLength(48);
    expect(cells[0]).toHaveAccessibleName(
      'Tecnología, afirmación 1: 1 de 5, Totalmente en desacuerdo',
    );
    expect(cells[0]).toHaveTextContent('1');
    // The scale is spelled out: the shade is never the only signal.
    expect(within(section).getByRole('list', { name: 'Escala de respuesta' })).toHaveTextContent(
      'Totalmente de acuerdo',
    );
  });

  it('cada dimensión tiene su pestaña con las afirmaciones, el valor y la justificación', async () => {
    backend({ completed: true });

    renderPage();

    const section = await screen.findByRole('region', { name: 'Respuestas al cuestionario' });
    const tabs = within(section).getAllByRole('tab');
    expect(tabs).toHaveLength(6);
    expect(tabs[0]).toHaveTextContent('Tecnología');
    expect(tabs[0]).toHaveTextContent('promedio');
    const panel = within(section).getByRole('tabpanel');
    expect(within(panel).getByText('Afirmación 1 de TRL')).toBeInTheDocument();
    expect(within(panel).getByText('Porque así lo vemos en TRL.')).toBeInTheDocument();
  });

  it('al hacer clic en una casilla abre su dimensión y marca la afirmación', async () => {
    backend({ completed: true });
    const user = userEvent.setup();

    renderPage();

    const section = await screen.findByRole('region', { name: 'Respuestas al cuestionario' });
    await user.click(within(section).getByRole('button', { name: /^Financiación, afirmación 3:/ }));

    const panel = within(section).getByRole('tabpanel');
    expect(within(panel).getByText('Afirmación 3 de FRL')).toBeInTheDocument();
    expect(within(section).getByRole('tab', { selected: true })).toHaveTextContent('Financiación');
  });
});

describe('ReportPage — sin el análisis profundo completo', () => {
  it('dice que el reporte solo existe tras el análisis profundo, y ni siquiera lo pide', async () => {
    const requests = backend({ completed: false });

    renderPage();

    expect(
      await screen.findByText(
        'El reporte completo solo está disponible después de completar el análisis profundo.',
      ),
    ).toBeInTheDocument();
    expect(requests.report).toBe(0);
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('si el backend responde que no está disponible, dice lo mismo', async () => {
    backend({ completed: true, report: 'not-available' });

    renderPage();

    expect(
      await screen.findByText(
        'El reporte completo solo está disponible después de completar el análisis profundo.',
      ),
    ).toBeInTheDocument();
  });
});

const PDF_NAME = 'reporte-irl-agroconecta-2026-09-08.pdf';

/** The PDF endpoint; `requests.pdf` counts the downloads. */
function pdfEndpoint(answer: 'ok' | 'not-available') {
  const requests = { pdf: 0 };
  server.use(
    mswHttp.get('*/diagnostics/:id/report/pdf', () => {
      requests.pdf += 1;
      return answer === 'not-available'
        ? problem('REPORT_NOT_AVAILABLE', 409)
        : new HttpResponse(new Blob(['%PDF-1.7'], { type: 'application/pdf' }), {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${PDF_NAME}"`,
            },
          });
    }),
  );
  return requests;
}

describe('ReportPage — descargar el reporte (HU-24)', () => {
  it('con el análisis profundo completo ofrece descargarlo como PDF', async () => {
    backend({ completed: true });

    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Descargar reporte (PDF)' }, { timeout: 5000 }),
    ).toBeEnabled();
  });

  it('descarga el archivo con el nombre que sugiere el servidor y lo confirma', async () => {
    backend({ completed: true });
    const requests = pdfEndpoint('ok');
    const createObjectURL = vi.fn(() => 'blob:reporte');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      // jsdom cannot navigate to a blob: the click is only observed.
    });

    renderPage();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Descargar reporte (PDF)' }, { timeout: 5000 }),
    );

    await vi.waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Reporte descargado.');
    });
    expect(requests.pdf).toBe(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe(PDF_NAME);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:reporte');
    click.mockRestore();
    vi.unstubAllGlobals();
  });

  it('si el servidor responde que aún no está disponible, lo dice', async () => {
    backend({ completed: true });
    pdfEndpoint('not-available');

    renderPage();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Descargar reporte (PDF)' }, { timeout: 5000 }),
    );

    await vi.waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'El reporte completo solo está disponible después de completar el análisis profundo.',
      );
    });
  });

  it('sin el análisis profundo completo no hay ninguna opción de descarga', async () => {
    backend({ completed: false });

    renderPage();

    await screen.findByText(
      'El reporte completo solo está disponible después de completar el análisis profundo.',
    );
    expect(screen.queryByRole('button', { name: /Descargar/ })).not.toBeInTheDocument();
  });
});
