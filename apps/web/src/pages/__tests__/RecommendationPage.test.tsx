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
  it('arma la recomendación en el cliente si el API no tiene la ruta', async () => {
    const profileBody = {
      diagnosticId: DIAGNOSTIC_ID,
      computedAt: '2026-09-10T21:34:54.523Z',
      dimensionResults: ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'].map((code) => ({
        dimensionCode: code,
        name: code,
        averageLikert: 3,
        irlLevel: code === 'IPRL' ? 1 : 6,
      })),
      bottleneck: { dimensions: ['IPRL'], level: 1 },
    };
    server.use(
      mswHttp.get(BASE, () =>
        HttpResponse.json(
          {
            type: 'https://errors.innlab.icesi.edu.co/not_found',
            title: `Cannot GET /api/v1/diagnosticos/${DIAGNOSTIC_ID}/recomendacion`,
            status: 404,
            detail: `Cannot GET /api/v1/diagnosticos/${DIAGNOSTIC_ID}/recomendacion`,
            instance: `/api/v1/diagnosticos/${DIAGNOSTIC_ID}/recomendacion`,
            code: 'NOT_FOUND',
          },
          { status: 404 },
        ),
      ),
      mswHttp.get('*/diagnosticos/:id/perfil', () =>
        HttpResponse.json(
          {
            type: 'https://errors.innlab.icesi.edu.co/not_found',
            title: 'Cannot GET /perfil',
            status: 404,
            detail: 'Cannot GET /perfil',
            code: 'NOT_FOUND',
          },
          { status: 404 },
        ),
      ),
      mswHttp.post('*/diagnosticos/:id/perfil', () =>
        HttpResponse.json(profileBody, { status: 201 }),
      ),
    );

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Consultoría' }),
    ).toBeInTheDocument();
  });

  it('muestra la recomendación persistida', async () => {
    server.use(mswHttp.get(BASE, () => HttpResponse.json(RECOMENDACION)));

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Consultoría' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/riesgo legal más urgente/)).toBeInTheDocument();
  });

  it('genera la recomendación automáticamente cuando todavía no existe', async () => {
    // 409 con ROUTING_RECOMMENDATION_NOT_GENERATED no es un error: es el
    // estado inicial. Quien llega a esta ruta quiere ver la recomendación,
    // así que la página la dispara sola — no hay botón que pulsar.
    server.use(
      mswHttp.get(BASE, () =>
        problema(
          'ROUTING_RECOMMENDATION_NOT_GENERATED',
          409,
          'Todavía no tiene recomendación generada.',
        ),
      ),
      mswHttp.post(BASE, () => HttpResponse.json(RECOMENDACION, { status: 201 })),
    );

    renderPage();

    expect(
      screen.queryByRole('button', { name: /Generar recomendación/ }),
    ).not.toBeInTheDocument();

    expect(
      await screen.findByRole('heading', { name: 'Consultoría' }),
    ).toBeInTheDocument();
  });

  it('muestra un estado de carga mientras la generación está en curso', async () => {
    let resolvePost!: () => void;
    server.use(
      mswHttp.get(BASE, () =>
        problema('ROUTING_RECOMMENDATION_NOT_GENERATED', 409, 'aún no'),
      ),
      mswHttp.post(
        BASE,
        () =>
          new Promise<Response>((resolve) => {
            resolvePost = () =>
              resolve(HttpResponse.json(RECOMENDACION, { status: 201 }));
          }),
      ),
    );

    renderPage();

    await screen.findByText('Generando recomendación…');

    resolvePost();

    expect(
      await screen.findByRole('heading', { name: 'Consultoría' }),
    ).toBeInTheDocument();
  });

  it('no reintenta la generación indefinidamente si falla', async () => {
    let intentosDePost = 0;
    server.use(
      mswHttp.get(BASE, () =>
        problema('ROUTING_RECOMMENDATION_NOT_GENERATED', 409, 'aún no'),
      ),
      mswHttp.post(BASE, () => {
        intentosDePost += 1;
        return problema(
          'ROUTING_NO_ACTIVE_CONFIGURATION',
          409,
          'No hay versión vigente.',
        );
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'No hay una configuración de enrutamiento vigente',
      );
    });

    // Un solo intento: el efecto que dispara la generación se apaga en
    // cuanto la mutación deja de estar "idle", así que un fallo no debe
    // desatar un bucle de reintentos.
    expect(intentosDePost).toBe(1);
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
