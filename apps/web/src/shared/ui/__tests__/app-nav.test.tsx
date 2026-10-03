import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http as mswHttp, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { PageShell } from '../page-shell';
import { renderWithClient } from '@/test/render-with-client';

const CURRENT = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const NEWEST = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function diagnostic(id: string, completed = true) {
  return {
    id,
    userId: 'user-1',
    state: completed ? 'PROFILE_GENERATED' : 'WITH_INITIATIVE',
    completed,
    deepAnalysisAccepted: false,
    deepAnalysisCompleted: false,
    createdAt: '2026-03-01T00:00:00.000Z',
    frameworkVersion: 'KTH-IRL-1.0',
  };
}

function renderAt(path: string, showNavigation = true) {
  return renderWithClient(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/diagnosticos/:id/resultados"
          element={<PageShell showNavigation={showNavigation}>contenido</PageShell>}
        />
        <Route
          path="/panel"
          element={<PageShell showNavigation={showNavigation}>contenido</PageShell>}
        />
        <Route path="/publica" element={<PageShell>contenido</PageShell>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppNav — navegación de las pantallas posteriores al asistente', () => {
  it('conserva el descriptor institucional en la cabecera y añade la navegación a continuación', () => {
    renderAt(`/diagnosticos/${CURRENT}/resultados`);

    // The descriptor is still there, once, and the navigation follows it.
    const descriptors = screen.getAllByRole('link', { name: /Inicio · Diagnóstico IRL/ });
    expect(descriptors).toHaveLength(1);
    const header = screen.getByRole('banner');
    expect(header).toContainElement(screen.getByRole('navigation', { name: 'Principal' }));
    expect(
      descriptors[0].compareDocumentPosition(
        screen.getByRole('navigation', { name: 'Principal' }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('enlaza el panel y los resultados del diagnóstico en que se está', () => {
    renderAt(`/diagnosticos/${CURRENT}/resultados`);

    expect(screen.getByRole('link', { name: 'Panel' })).toHaveAttribute('href', '/panel');
    expect(screen.getByRole('link', { name: 'Resultados' })).toHaveAttribute(
      'href',
      `/diagnosticos/${CURRENT}/resultados`,
    );
  });

  it('no ofrece el cuestionario: es un paso del asistente, no una pantalla', () => {
    renderAt(`/diagnosticos/${CURRENT}/resultados`);

    expect(screen.queryByRole('link', { name: 'Cuestionario' })).not.toBeInTheDocument();
    expect(screen.queryByText('Cuestionario')).not.toBeInTheDocument();
  });

  it('marca la página actual con aria-current', () => {
    renderAt(`/diagnosticos/${CURRENT}/resultados`);

    expect(screen.getByRole('link', { name: 'Resultados' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Panel' })).not.toHaveAttribute('aria-current');
  });

  it('fuera de un diagnóstico usa el más reciente con resultados', async () => {
    server.use(
      mswHttp.get('*/diagnostics', () =>
        HttpResponse.json([diagnostic(NEWEST), diagnostic(CURRENT)]),
      ),
    );

    renderAt('/panel');

    expect(await screen.findByRole('link', { name: 'Resultados' })).toHaveAttribute(
      'href',
      `/diagnosticos/${NEWEST}/resultados`,
    );
    expect(screen.getByRole('link', { name: 'Panel' })).toHaveAttribute('aria-current', 'page');
  });

  it('salta un diagnóstico que sigue en el asistente: no tiene resultados que abrir', async () => {
    server.use(
      mswHttp.get('*/diagnostics', () =>
        HttpResponse.json([diagnostic(NEWEST, false), diagnostic(CURRENT)]),
      ),
    );

    renderAt('/panel');

    expect(await screen.findByRole('link', { name: 'Resultados' })).toHaveAttribute(
      'href',
      `/diagnosticos/${CURRENT}/resultados`,
    );
  });

  it('sin ningún diagnóstico terminado, resultados queda deshabilitado', async () => {
    server.use(mswHttp.get('*/diagnostics', () => HttpResponse.json([diagnostic(NEWEST, false)])));

    renderAt('/panel');

    expect(screen.getByRole('link', { name: 'Panel' })).toBeInTheDocument();
    const results = await screen.findByText('Resultados');
    expect(screen.queryByRole('link', { name: 'Resultados' })).not.toBeInTheDocument();
    expect(results).toHaveAttribute('aria-disabled', 'true');
  });

  it('dentro de un diagnóstico no pide la lista de diagnósticos', () => {
    // No handler for GET /diagnostics: an unhandled request would fail the suite.
    renderAt(`/diagnosticos/${CURRENT}/resultados`);

    expect(screen.getByRole('link', { name: 'Resultados' })).toBeInTheDocument();
  });

  it('no aparece en las pantallas sin navegación: es opt-in', () => {
    renderAt('/publica');

    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Inicio · Diagnóstico IRL/ })).toBeInTheDocument();
  });
});

// The descriptor leads to the panel where there is navigation and to the landing where there is none.
describe('BrandDescriptor — destino según la pantalla', () => {
  it('con navegación (resultados, panel) lleva al panel', () => {
    renderAt(`/diagnosticos/${CURRENT}/resultados`);

    expect(screen.getByRole('link', { name: /Inicio · Diagnóstico IRL/ })).toHaveAttribute(
      'href',
      '/panel',
    );
  });

  it('sin navegación (portada, asistente) lleva a la portada', () => {
    renderAt('/publica');

    expect(screen.getByRole('link', { name: /Inicio · Diagnóstico IRL/ })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
