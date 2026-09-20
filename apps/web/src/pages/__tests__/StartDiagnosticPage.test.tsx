import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import StartDiagnosticPage from '../StartDiagnosticPage';
import { renderWithClient } from '@/test/render-with-client';

const DIAGNOSTIC_ID = '3f1c9a52-7d4e-4b8a-9c21-5e6f7a8b9c0d';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const diagnostic = {
  id: DIAGNOSTIC_ID,
  userId: 'user-1',
  state: 'STARTED',
  completed: false,
  deepAnalysisAccepted: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
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

  // StrictMode monta los efectos dos veces en desarrollo: sin guarda serían dos POST a la vez.
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

  it('muestra que está preparando el diagnóstico mientras espera', () => {
    server.use(mswHttp.post('*/diagnostics', () => new Promise(() => undefined)));

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Preparando tu diagnóstico…');
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
});
