import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { setupServer } from 'msw/node';
import LandingPage from '../LandingPage';
import { clearSession, saveSession } from '@/shared/auth/session';
import { meContextHandler } from '@/test/fixtures/me-context';
import { renderWithClient } from '@/test/render-with-client';

// No handlers: any request when mounting the landing would fail the suite.
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => {
  clearSession();
});

function renderPage() {
  return renderWithClient(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/diagnosticos/nuevo" element={<div>INICIO_STUB</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LandingPage — portada pública', () => {
  it('tiene un único botón, «Iniciar diagnóstico», que lleva a /diagnosticos/nuevo', () => {
    renderPage();

    const cta = screen.getAllByRole('link', { name: 'Iniciar diagnóstico' });
    expect(cta).toHaveLength(1);
    expect(cta[0]).toHaveAttribute('href', '/diagnosticos/nuevo');
    // There is no competing action: neither «Conocer INNLAB» nor any other button.
    expect(screen.queryByRole('link', { name: 'Conocer INNLAB' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('el botón abre la pantalla de inicio, que resuelve la sesión y el diagnóstico', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('link', { name: 'Iniciar diagnóstico' }));

    expect(screen.getByText('INICIO_STUB')).toBeInTheDocument();
  });

  it('se ve sin sesión y no pide nada al servidor al montarse', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Diagnóstico IRL para iniciativas de innovación.',
    );
  });

  it('no lleva navegación principal', () => {
    renderPage();

    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
  });

  it('el descriptor institucional lleva a la portada, no al panel', () => {
    renderPage();

    expect(screen.getByRole('link', { name: /Inicio · Diagnóstico IRL/ })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('no enlaza al diagnóstico fijo del seed', () => {
    renderPage();

    const hrefs = screen.queryAllByRole('link').map((l) => l.getAttribute('href') ?? '');
    expect(hrefs.some((h) => h.includes('a0eebc99'))).toBe(false);
    expect(hrefs.some((h) => h.includes('/demo/'))).toBe(false);
  });

  describe('menú de cuenta', () => {
    it('no se ofrece sin sesión', () => {
      renderPage();

      expect(screen.queryByRole('button', { name: 'Cuenta' })).not.toBeInTheDocument();
    });

    it('se ofrece si el usuario ya tiene sesión', async () => {
      saveSession({ token: 'id-token', accessToken: 'access-token' });
      server.use(meContextHandler());

      renderPage();

      expect(await screen.findByRole('button', { name: 'Cuenta' })).toBeInTheDocument();
    });
  });

  // The landing promised more than the draft does.
  it('no promete conservar el progreso entre sesiones', () => {
    renderPage();

    expect(screen.queryByText(/entre sesiones/)).not.toBeInTheDocument();
    expect(screen.getByText(/mientras mantengas abierta la pestaña/)).toBeInTheDocument();
  });
});
