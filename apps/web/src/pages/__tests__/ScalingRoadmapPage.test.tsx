import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import ScalingRoadmapPage from '../ScalingRoadmapPage';
import { renderWithClient } from '@/test/render-with-client';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const BASE = '*/diagnosticos/:id/roadmap';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const ROADMAP = {
  diagnosticId: DIAGNOSTIC_ID,
  generatedAt: '2026-09-08T10:00:00.000Z',
  phases: [
    {
      order: 1,
      dimensions: [
        { dimensionCode: 'BRL', currentLevel: 3, targetLevel: 4, enables: ['FRL'] },
        { dimensionCode: 'IPRL', currentLevel: 1, targetLevel: 4, enables: ['FRL'] },
      ],
    },
    {
      order: 2,
      dimensions: [
        { dimensionCode: 'FRL', currentLevel: 2, targetLevel: 4, enables: [] },
      ],
    },
  ],
  dimensionsWithoutIntervention: ['TRL', 'CRL', 'TmRL'],
};

function problema(code: string, status: number) {
  return HttpResponse.json(
    {
      type: `https://errors.innlab.icesi.edu.co/${code.toLowerCase()}`,
      title: code.replace(/_/g, ' ').toLowerCase(),
      status,
      detail: 'detalle',
      code,
    },
    { status },
  );
}

function renderPage() {
  return renderWithClient(
    <MemoryRouter initialEntries={[`/diagnosticos/${DIAGNOSTIC_ID}/roadmap`]}>
      <Routes>
        <Route path="/diagnosticos/:id/roadmap" element={<ScalingRoadmapPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ScalingRoadmapPage', () => {
  it('muestra las fases del roadmap', async () => {
    server.use(mswHttp.get(BASE, () => HttpResponse.json(ROADMAP)));

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Fase 1' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Fase 2' })).toBeInTheDocument();
  });

  it('distingue un grafo mal configurado de un fallo genérico', async () => {
    // Un ciclo es un defecto de configuración del sistema; el mensaje
    // tiene que dirigir a quien puede arreglarlo, no culpar al usuario.
    server.use(
      mswHttp.get(BASE, () => problema('ROADMAP_GRAPH_HAS_CYCLE', 500)),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'grafo de dependencias entre dimensiones está mal configurado',
      );
    });
  });

  it('avisa cuando el diagnóstico no tiene perfil calculado', async () => {
    server.use(mswHttp.get(BASE, () => problema('CONFLICT', 409)));

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'aún no tiene un perfil de madurez calculado',
      );
    });
  });

  it('construye el roadmap en el cliente si el API no tiene la ruta', async () => {
    const profileBody = {
      diagnosticId: DIAGNOSTIC_ID,
      computedAt: '2026-09-10T21:34:54.523Z',
      dimensionResults: ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'].map((code) => ({
        dimensionCode: code,
        name: code,
        averageLikert: 3,
        irlLevel: 6,
      })),
      bottleneck: { dimensions: ['TRL'], level: 6 },
    };
    server.use(
      mswHttp.get(BASE, () =>
        HttpResponse.json(
          {
            type: 'https://errors.innlab.icesi.edu.co/not_found',
            title: `Cannot GET /api/v1/diagnosticos/${DIAGNOSTIC_ID}/roadmap`,
            status: 404,
            detail: `Cannot GET /api/v1/diagnosticos/${DIAGNOSTIC_ID}/roadmap`,
            instance: `/api/v1/diagnosticos/${DIAGNOSTIC_ID}/roadmap`,
            code: 'NOT_FOUND',
          },
          { status: 404 },
        ),
      ),
      mswHttp.get('*/diagnosticos/:id/perfil', () =>
        HttpResponse.json(
          {
            type: 'https://errors.innlab.icesi.edu.co/not_found',
            title: 'Cannot GET /api/v1/diagnosticos/x/perfil',
            status: 404,
            detail: 'Cannot GET /api/v1/diagnosticos/x/perfil',
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
      await screen.findByRole('heading', { name: 'Sin fases pendientes' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('presenta un roadmap vacío como resultado sano, sin alerta', async () => {
    server.use(
      mswHttp.get(BASE, () =>
        HttpResponse.json({
          ...ROADMAP,
          phases: [],
          dimensionsWithoutIntervention: [
            'TRL',
            'CRL',
            'BRL',
            'IPRL',
            'TmRL',
            'FRL',
          ],
        }),
      ),
    );

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Sin fases pendientes' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
