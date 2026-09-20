import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import ScalingRoadmapPage from '../ScalingRoadmapPage';
import { renderWithClient } from '@/test/render-with-client';
import { dimensionRefFixture } from '@/test/fixtures/dimensions';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const BASE = '*/diagnostics/:id/roadmap';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function target(code: 'BRL' | 'IPRL' | 'FRL') {
  const { name, shortName } = dimensionRefFixture(code);
  return { dimensionCode: code, name, shortName };
}

const ROADMAP = {
  diagnosticId: DIAGNOSTIC_ID,
  generatedAt: '2026-09-08T10:00:00.000Z',
  phases: [
    {
      order: 1,
      dimensions: [
        {
          ...target('BRL'),
          currentLevel: 3,
          targetLevel: 4,
          enables: [dimensionRefFixture('FRL')],
        },
        {
          ...target('IPRL'),
          currentLevel: 1,
          targetLevel: 4,
          enables: [dimensionRefFixture('FRL')],
        },
      ],
    },
    {
      order: 2,
      dimensions: [
        { ...target('FRL'), currentLevel: 2, targetLevel: 4, enables: [] },
      ],
    },
  ],
  dimensionsWithoutIntervention: [
    dimensionRefFixture('TRL'),
    dimensionRefFixture('CRL'),
    dimensionRefFixture('TmRL'),
  ],
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
  // Backlog 4.5: every dimension the roadmap names comes with its names in the
  // response. The labels below exist nowhere in the application code.
  it('nombra las dimensiones con el shortName que trae la respuesta', async () => {
    const respuesta = {
      ...ROADMAP,
      phases: [
        {
          order: 1,
          dimensions: [
            {
              dimensionCode: 'BRL',
              name: 'Nombre largo de BRL',
              shortName: 'Etiqueta-BRL-del-backend',
              currentLevel: 3,
              targetLevel: 4,
              enables: [
                {
                  code: 'FRL',
                  name: 'Nombre largo de FRL',
                  shortName: 'Etiqueta-FRL-del-backend',
                },
              ],
            },
          ],
        },
      ],
      dimensionsWithoutIntervention: [
        { code: 'TRL', name: 'Nombre largo de TRL', shortName: 'Etiqueta-TRL-del-backend' },
      ],
    };
    server.use(mswHttp.get(BASE, () => HttpResponse.json(respuesta)));

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Etiqueta-BRL-del-backend' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/desbloquea Etiqueta-FRL-del-backend/)).toBeInTheDocument();
    expect(screen.getByText(/Etiqueta-TRL-del-backend/)).toBeInTheDocument();
  });

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

  it('presenta un roadmap vacío como resultado sano, sin alerta', async () => {
    server.use(
      mswHttp.get(BASE, () =>
        HttpResponse.json({
          ...ROADMAP,
          phases: [],
          dimensionsWithoutIntervention: (
            ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const
          ).map(dimensionRefFixture),
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
