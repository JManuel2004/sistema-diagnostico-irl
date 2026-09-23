import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import type { QuestionnaireStructure } from '@innlab/contracts';
import { renderWithClient } from '../../../../test/render-with-client';
import { QuestionnaireView } from '../QuestionnaireView';
import { useQuestionnaireDraftStore } from '../../store/questionnaire-draft.store';

const DIMENSION_CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

function buildFixture(): QuestionnaireStructure {
  return {
    frameworkVersion: 'KTH-IRL-1.0',
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
    http.get('*/api/v1/catalog/questionnaire', () =>
      HttpResponse.json(buildFixture()),
    ),
  );
}

function withErrorHandler(): void {
  server.use(
    http.get('*/api/v1/catalog/questionnaire', () =>
      HttpResponse.json({ error: 'Internal server error' }, { status: 500 }),
    ),
  );
}

describe('QuestionnaireView', () => {
  beforeEach(() => {
    // Reset the draft store so cross-test residue (active tab, answers
    // persisted by an earlier case via the persist middleware) doesn't
    // leak between scenarios.
    useQuestionnaireDraftStore.getState().clear();
    sessionStorage.clear();
  });

  it('renders the skeleton while the request is in flight', () => {
    server.use(
      http.get('*/api/v1/catalog/questionnaire', () => new Promise(() => undefined)),
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

  it('switches to the clicked dimension and shows its statements', { timeout: 10_000 }, async () => {
    withSuccessHandler();
    const user = userEvent.setup();
    renderWithClient(<QuestionnaireView />);

    await waitFor(() => screen.getByRole('tablist', { name: 'Dimensiones IRL' }));

    await user.click(screen.getByRole('tab', { name: 'CRL' }));

    await waitFor(() =>
      expect(screen.getByRole('tabpanel')).toHaveTextContent('CRL — Nombre'),
    );
  });

  describe('scroll', () => {
    const scrollIntoView = vi.fn();

    beforeEach(() => {
      scrollIntoView.mockClear();
      // jsdom does not implement `scrollIntoView`: it is defined to observe the calls.
      Element.prototype.scrollIntoView = scrollIntoView;
    });

    afterEach(() => {
      // @ts-expect-error restores jsdom's state, which does not define the method.
      delete Element.prototype.scrollIntoView;
    });

    it('does not scroll when the questionnaire mounts', async () => {
      withSuccessHandler();
      renderWithClient(<QuestionnaireView />);

      await waitFor(() => screen.getByRole('tablist', { name: 'Dimensiones IRL' }));

      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('does not scroll when it mounts on a tab restored from the draft', async () => {
      withSuccessHandler();
      useQuestionnaireDraftStore.getState().setActiveTab('BRL');
      renderWithClient(<QuestionnaireView />);

      await waitFor(() => screen.getByRole('tablist', { name: 'Dimensiones IRL' }));

      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('scrolls back to the top of the panel when the dimension changes', async () => {
      withSuccessHandler();
      const user = userEvent.setup();
      renderWithClient(<QuestionnaireView />);

      await waitFor(() => screen.getByRole('tablist', { name: 'Dimensiones IRL' }));
      await user.click(screen.getByRole('tab', { name: 'CRL' }));

      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    });
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
      http.get('*/api/v1/catalog/questionnaire', () => {
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

  it('persists answers when switching dimension tabs and after remount', { timeout: 15_000 }, async () => {
    withSuccessHandler();
    const user = userEvent.setup();
    const utils = renderWithClient(<QuestionnaireView />);

    await waitFor(() => screen.getByRole('tablist', { name: 'Dimensiones IRL' }));

    // In the first (default) panel, select "De acuerdo" for the first statement
    const rg = screen.getByRole('radiogroup', { name: 'Afirmación 1 de TRL' });
    const radio = within(rg).getByRole('radio', { name: '4 — De acuerdo' });

    await user.click(radio);
    expect(radio).toBeChecked();

    // Switch to another dimension and back
    await user.click(screen.getByRole('tab', { name: 'CRL' }));
    await waitFor(() => screen.getByRole('tabpanel'));
    await user.click(screen.getByRole('tab', { name: 'TRL' }));
    await waitFor(() => screen.getByRole('tabpanel'));

    // After returning, the previously selected radio should still be checked
    const rg2 = screen.getByRole('radiogroup', { name: 'Afirmación 1 de TRL' });
    expect(within(rg2).getByRole('radio', { name: '4 — De acuerdo' })).toBeChecked();

    // Unmount and remount the view (simulating navigation away and back)
    utils.unmount();
    renderWithClient(<QuestionnaireView />);
    await waitFor(() => screen.getByRole('tablist', { name: 'Dimensiones IRL' }));

    const remountedRg = screen.getByRole('radiogroup', { name: 'Afirmación 1 de TRL' });
    expect(within(remountedRg).getByRole('radio', { name: '4 — De acuerdo' })).toBeChecked();
  });
});
