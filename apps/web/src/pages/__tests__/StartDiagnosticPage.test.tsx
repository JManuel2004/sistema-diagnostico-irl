import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import StartDiagnosticPage from '../StartDiagnosticPage';
import { renderWithClient } from '@/test/render-with-client';
import { meContextHandler, signIn } from '@/test/fixtures/me-context';
import { clearSession } from '@/shared/auth/session';

const DIAGNOSTIC_ID = '3f1c9a52-7d4e-4b8a-9c21-5e6f7a8b9c0d';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  signIn();
  server.use(meContextHandler());
});
afterEach(() => {
  server.resetHandlers();
  clearSession();
});
afterAll(() => server.close());

const diagnostic = {
  id: DIAGNOSTIC_ID,
  userId: 'user-1',
  state: 'STARTED',
  completed: false,
  deepAnalysisAccepted: false,
  deepAnalysisCompleted: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  frameworkVersion: 'KTH-IRL-1.0',
};

function renderPage() {
  return renderWithClient(
    <StrictMode>
      <MemoryRouter initialEntries={['/diagnosticos/nuevo']}>
        <Routes>
          <Route path="/diagnosticos/nuevo" element={<StartDiagnosticPage />} />
          <Route path="/diagnosticos/:id/asistente" element={<div>ASISTENTE_STUB</div>} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
}

describe('StartDiagnosticPage — continuar solo tras «Iniciar diagnóstico»', () => {
  it('pide el diagnóstico al abrirse y abre el asistente, sin otro clic', async () => {
    server.use(
      mswHttp.post('*/diagnostics', () => HttpResponse.json(diagnostic, { status: 201 })),
      mswHttp.get('*/diagnostics', () => HttpResponse.json([diagnostic])),
    );

    renderPage();

    expect(await screen.findByText('ASISTENTE_STUB')).toBeInTheDocument();
  });

  // StrictMode mounts effects twice in development: without a guard there would be two POSTs at once.
  it('pide el diagnóstico una sola vez, también bajo StrictMode', async () => {
    let peticiones = 0;
    server.use(
      mswHttp.post('*/diagnostics', () => {
        peticiones += 1;
        return HttpResponse.json(diagnostic, { status: 201 });
      }),
      mswHttp.get('*/diagnostics', () => HttpResponse.json([diagnostic])),
    );

    renderPage();
    await screen.findByText('ASISTENTE_STUB');

    expect(peticiones).toBe(1);
  });

  it('muestra que está preparando el diagnóstico mientras espera', async () => {
    server.use(mswHttp.post('*/diagnostics', () => new Promise(() => undefined)));

    renderPage();

    expect(await screen.findByText('Preparando tu diagnóstico…')).toBeInTheDocument();
  });

  it('avisa si no se pudo y permite reintentar', async () => {
    let intentos = 0;
    server.use(
      mswHttp.post('*/diagnostics', () => {
        intentos += 1;
        return intentos === 1
          ? HttpResponse.json({ message: 'boom' }, { status: 500 })
          : HttpResponse.json(diagnostic, { status: 201 });
      }),
      mswHttp.get('*/diagnostics', () => HttpResponse.json([diagnostic])),
    );

    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No fue posible iniciar el diagnóstico',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('ASISTENTE_STUB')).toBeInTheDocument();
    expect(intentos).toBe(2);
  });

  // RF-01, scenario "user context unavailable": a diagnostic belongs to whoever starts it.
  it('sin el perfil del usuario no pide el diagnóstico y dice por qué', async () => {
    let requests = 0;
    server.use(
      meContextHandler(503),
      mswHttp.post('*/diagnostics', () => {
        requests += 1;
        return HttpResponse.json(diagnostic, { status: 201 });
      }),
    );

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/no está disponible temporalmente/);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(requests).toBe(0);
  });
});
