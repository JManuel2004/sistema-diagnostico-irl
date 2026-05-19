import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { QuestionnaireStructure } from '@innlab/contracts';
import { renderWithClient } from '../../../../test/render-with-client';
import { QuestionnaireView } from '../QuestionnaireView';

const DIMENSION_CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

function buildFixture(): QuestionnaireStructure {
  return {
    versionMarco: 'KTH-IRL-1.0',
    dimensions: DIMENSION_CODES.map((code, dimIdx) => ({
      code,
      name: `${code} — Nombre`,
      description: `Descripción de ${code}`,
      sequence: dimIdx + 1,
      statements: Array.from({ length: 8 }, (_, i) => ({
        id: String(dimIdx * 8 + i + 1),
        dimensionCode: code,
        sequence: i + 1,
        text: `Afirmación ${i + 1} de ${code}`,
      })),
    })),
  };
}

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function withSuccessHandler(): void {
  server.use(
    http.get('http://localhost/api/v1/catalogo/cuestionario', () =>
      HttpResponse.json(buildFixture()),
    ),
  );
}

function withErrorHandler(): void {
  server.use(
    http.get('http://localhost/api/v1/catalogo/cuestionario', () =>
      HttpResponse.json({ error: 'Internal server error' }, { status: 500 }),
    ),
  );
}

describe('QuestionnaireView', () => {
  it('renders the skeleton while the request is in flight', () => {
    server.use(
      http.get('http://localhost/api/v1/catalogo/cuestionario', () => new Promise(() => undefined)),
    );
    renderWithClient(<QuestionnaireView />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Cargando cuestionario')).toBeInTheDocument();
  });

  it('renders six dimension tabs after a successful fetch', async () => {
    withSuccessHandler();
    renderWithClient(<QuestionnaireView />);

    await waitFor(() => screen.getByRole('tablist', { name: 'Dimensiones IRL' }));

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(6);
    for (const code of DIMENSION_CODES) {
      expect(screen.getByRole('tab', { name: code })).toBeInTheDocument();
    }
  });

  it('shows 8 statements for the first dimension by default', async () => {
    withSuccessHandler();
    renderWithClient(<QuestionnaireView />);

    await waitFor(() => screen.getByRole('tablist', { name: 'Dimensiones IRL' }));

    expect(screen.getByText('Afirmación 1 de 8')).toBeInTheDocument();
    expect(screen.getByText('Afirmación 8 de 8')).toBeInTheDocument();
  });

  it('switches to the clicked dimension and shows its statements', async () => {
    withSuccessHandler();
    const user = userEvent.setup();
    renderWithClient(<QuestionnaireView />);

    await waitFor(() => screen.getByRole('tablist', { name: 'Dimensiones IRL' }));

    await user.click(screen.getByRole('tab', { name: 'CRL' }));

    const activePanel = screen.getByRole('tabpanel');
    expect(activePanel).toHaveTextContent('CRL — Nombre');
  });

  it('renders an error state when the request fails', async () => {
    withErrorHandler();
    renderWithClient(<QuestionnaireView />);

    await waitFor(() => screen.getByRole('alert'));

    expect(screen.getByText('No pudimos cargar el cuestionario')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('clicking Reintentar triggers a refetch', async () => {
    let callCount = 0;
    server.use(
      http.get('http://localhost/api/v1/catalogo/cuestionario', () => {
        callCount++;
        return HttpResponse.json({ error: 'fail' }, { status: 500 });
      }),
    );
    const user = userEvent.setup();
    renderWithClient(<QuestionnaireView />);

    await waitFor(() => screen.getByRole('alert'));

    const before = callCount;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(callCount).toBeGreaterThan(before));
  });
});
