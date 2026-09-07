import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import RecommendationPage from '../RecommendationPage';
import { renderWithClient } from '@/test/render-with-client';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const BASE = '*/diagnosticos/:id/recomendacion';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const RECOMENDACION = {
  diagnosticId: DIAGNOSTIC_ID,
  resultadoTipo: 'RECOMENDACION' as const,
  principal: { idServicio: 3, nombre: 'Consultoría', posicion: 1, puntaje: 5.55 },
  justificacion: 'Atiende el riesgo legal más urgente del perfil.',
  motivoSinRecomendacion: null,
  alternativas: [
    { idServicio: 2, nombre: 'Mentoría', posicion: 2, puntaje: 3.8 },
  ],
  versionConfiguracion: 1,
  generadaEn: '2026-09-07T14:30:00.000Z',
};

function problema(code: string, status: number, detail: string) {
  return HttpResponse.json(
    {
      type: `https://errors.innlab.icesi.edu.co/${code.toLowerCase()}`,
      title: code.replace(/_/g, ' ').toLowerCase(),
      status,
      detail,
      code,
    },
    { status },
  );
}

function renderPage() {
  return renderWithClient(
    <MemoryRouter initialEntries={[`/diagnosticos/${DIAGNOSTIC_ID}/recomendacion`]}>
      <Routes>
        <Route
          path="/diagnosticos/:id/recomendacion"
          element={<RecommendationPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RecommendationPage', () => {
  it('muestra la recomendación persistida', async () => {
    server.use(mswHttp.get(BASE, () => HttpResponse.json(RECOMENDACION)));

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Consultoría' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/riesgo legal más urgente/)).toBeInTheDocument();
  });

  it('ofrece generarla cuando el backend dice que aún no existe', async () => {
    // 409 con ROUTING_RECOMMENDATION_NOT_GENERATED no es un error: es el
    // estado inicial. Distinguirlo depende del `code`, que el interceptor
    // conserva.
    server.use(
      mswHttp.get(BASE, () =>
        problema(
          'ROUTING_RECOMMENDATION_NOT_GENERATED',
          409,
          'Todavía no tiene recomendación generada.',
        ),
      ),
    );

    renderPage();

    expect(
      await screen.findByRole('button', { name: 'Generar recomendación' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('genera la recomendación y la muestra sin recargar', async () => {
    server.use(
      mswHttp.get(BASE, () =>
        problema('ROUTING_RECOMMENDATION_NOT_GENERATED', 409, 'aún no'),
      ),
      mswHttp.post(BASE, () => HttpResponse.json(RECOMENDACION, { status: 201 })),
    );

    renderPage();

    await userEvent.click(
      await screen.findByRole('button', { name: 'Generar recomendación' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Consultoría' }),
    ).toBeInTheDocument();
  });

  it('distingue la falta de configuración vigente de un error genérico', async () => {
    server.use(
      mswHttp.get(BASE, () =>
        problema(
          'ROUTING_NO_ACTIVE_CONFIGURATION',
          409,
          'No hay versión vigente.',
        ),
      ),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'No hay una configuración de enrutamiento vigente',
      );
    });
  });

  it('avisa cuando el diagnóstico no tiene perfil calculado', async () => {
    server.use(
      mswHttp.get(BASE, () =>
        problema('ROUTING_PROFILE_NOT_COMPUTED', 409, 'sin perfil'),
      ),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'aún no tiene un perfil de madurez calculado',
      );
    });
  });

  it('carga la traza solo cuando se despliega el panel', async () => {
    let pedidosDeTraza = 0;
    server.use(
      mswHttp.get(`${BASE}/traza`, () => {
        pedidosDeTraza += 1;
        return HttpResponse.json({
          diagnosticId: DIAGNOSTIC_ID,
          excluidosCapa1: [],
          rankingPreExcepcion: [],
          excepcionesActivadas: [],
          excepcionesDescartadas: [],
          rankingPostExcepcion: [],
          ajustadoPorExcepcion: false,
          caracterizacionIncompleta: [],
          versionConfiguracion: 1,
          snapshotCalibracion: 1,
          snapshotParametros: 1,
          hashHechos: 'a'.repeat(64),
          evaluadoEn: '2026-09-07T14:30:00.000Z',
        });
      }),
      mswHttp.get(BASE, () => HttpResponse.json(RECOMENDACION)),
    );

    renderPage();
    await screen.findByRole('heading', { name: 'Consultoría' });

    expect(pedidosDeTraza).toBe(0);

    await userEvent.click(
      screen.getByRole('button', { name: /Cómo se llegó a esta recomendación/ }),
    );

    await waitFor(() => expect(pedidosDeTraza).toBe(1));
  });
});
