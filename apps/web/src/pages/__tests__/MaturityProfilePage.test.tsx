import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type * as ReactRouterDom from 'react-router-dom';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import MaturityProfilePage from '../MaturityProfilePage';
import { renderWithClient } from '@/test/render-with-client';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const DIMENSION_CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

function buildProfileFixture(): unknown {
  return {
    diagnosticId: DIAGNOSTIC_ID,
    computedAt: '2026-01-01T00:00:00.000Z',
    dimensionResults: DIMENSION_CODES.map((code) => ({
      dimensionCode: code,
      name: `${code} — Nombre`,
      averageLikert: 3,
      irlLevel: 6,
    })),
    bottleneck: { dimensions: ['TRL'], level: 6 },
    strength: { dimensions: ['TRL'], level: 6 },
    asymmetry: { difference: 0, classification: 'acceptable' },
    gaps: { dimensions: [], threshold: 3 },
  };
}

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function renderPage() {
  return renderWithClient(
    <MemoryRouter initialEntries={[`/diagnosticos/${DIAGNOSTIC_ID}/perfil`]}>
      <Routes>
        <Route path="/diagnosticos/:id/perfil" element={<MaturityProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MaturityProfilePage', () => {
  it('muestra el botón "Generar recomendación" una vez cargado el perfil', async () => {
    server.use(
      mswHttp.get('*/diagnosticos/:id/perfil', () =>
        HttpResponse.json(buildProfileFixture()),
      ),
    );

    renderPage();

    expect(
      await screen.findByRole('button', { name: /Generar recomendación/ }),
    ).toBeInTheDocument();
  });

  it('navega a /diagnosticos/:id/recomendacion al hacer click', async () => {
    server.use(
      mswHttp.get('*/diagnosticos/:id/perfil', () =>
        HttpResponse.json(buildProfileFixture()),
      ),
    );

    renderPage();

    const boton = await screen.findByRole('button', {
      name: /Generar recomendación/,
    });
    await userEvent.click(boton);

    expect(navigateMock).toHaveBeenCalledWith(
      `/diagnosticos/${DIAGNOSTIC_ID}/recomendacion`,
    );
  });

  it('ofrece también el roadmap de escalamiento', async () => {
    server.use(
      mswHttp.get('*/diagnosticos/:id/perfil', () =>
        HttpResponse.json(buildProfileFixture()),
      ),
    );

    renderPage();

    await userEvent.click(
      await screen.findByRole('button', { name: /Ver roadmap de escalamiento/ }),
    );

    expect(navigateMock).toHaveBeenCalledWith(
      `/diagnosticos/${DIAGNOSTIC_ID}/roadmap`,
    );
  });

  it('no muestra el botón mientras el perfil está cargando o si falla', async () => {
    server.use(
      mswHttp.get('*/diagnosticos/:id/perfil', () =>
        HttpResponse.json({ message: 'Internal server error' }, { status: 500 }),
      ),
    );

    renderPage();

    expect(
      await screen.findByText('No fue posible generar el diagnóstico'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Generar recomendación/ }),
    ).not.toBeInTheDocument();
  });
});
