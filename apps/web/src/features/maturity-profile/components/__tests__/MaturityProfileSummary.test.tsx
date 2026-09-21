import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DimensionCode, DimensionResult } from '@innlab/contracts';
import { dimensionResultFixture } from '@/test/fixtures/dimensions';
import { MaturityProfileSummary } from '../MaturityProfileSummary';

// ── Helper ────────────────────────────────────────────────────────────────────

function dr(code: DimensionResult['dimensionCode'], level: number): DimensionResult {
  return dimensionResultFixture(code, level);
}

// PayFlow levels: TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3
const PAYFLOW: readonly DimensionResult[] = [
  dr('TRL', 5),
  dr('CRL', 3),
  dr('BRL', 3),
  dr('IPRL', 2),
  dr('TmRL', 4),
  dr('FRL', 3),
];

// All equal levels → no imbalance, no gap
const UNIFORM: readonly DimensionResult[] = [
  dr('TRL', 6),
  dr('CRL', 6),
  dr('BRL', 6),
  dr('IPRL', 6),
  dr('TmRL', 6),
  dr('FRL', 6),
];

// Extreme spread → critical asymmetry and critical imbalances
const EXTREME: readonly DimensionResult[] = [
  dr('TRL', 9),
  dr('CRL', 1),
  dr('BRL', 9),
  dr('IPRL', 1),
  dr('TmRL', 9),
  dr('FRL', 1),
];

// ── Bottleneck card (RF-08) ───────────────────────────────────────────────────

describe('MaturityProfileSummary — bottleneck card (RF-08)', () => {
  describe('using server-provided bottleneck', () => {
    it('renders the bottleneck eyebrow label', () => {
      render(
        <MaturityProfileSummary
          dimensionResults={PAYFLOW}
          bottleneck={{ dimensions: ['IPRL'], level: 2 }}
        />,
      );
      expect(screen.getByText('Cuello de botella')).toBeInTheDocument();
    });

    it('shows the dimension name and level for a single bottleneck', () => {
      render(
        <MaturityProfileSummary
          dimensionResults={PAYFLOW}
          bottleneck={{ dimensions: ['IPRL'], level: 2 }}
        />,
      );
      expect(screen.getByText('Propiedad Intelectual — nivel 2')).toBeInTheDocument();
    });

    it('shows a tie summary title when multiple dimensions share the minimum', () => {
      render(
        <MaturityProfileSummary
          dimensionResults={PAYFLOW}
          bottleneck={{ dimensions: ['CRL', 'BRL', 'FRL'], level: 3 }}
        />,
      );
      expect(screen.getByText('3 dimensiones empatadas en nivel 3')).toBeInTheDocument();
    });

    it('lists the tied dimension names when there is more than one bottleneck', () => {
      render(
        <MaturityProfileSummary
          dimensionResults={PAYFLOW}
          bottleneck={{ dimensions: ['CRL', 'BRL', 'FRL'], level: 3 }}
        />,
      );
      // One chip per tied dimension, each with its own name.
      for (const name of ['Cliente', 'Negocio', 'Financiación']) {
        expect(screen.getByText(name)).toBeInTheDocument();
      }
    });

    it('does not show a name list inside the bottleneck card when there is only one dimension', () => {
      render(
        <MaturityProfileSummary
          dimensionResults={PAYFLOW}
          bottleneck={{ dimensions: ['IPRL'], level: 2 }}
        />,
      );
      const card = screen.getByRole('group', {
        name: 'Cuello de botella: Propiedad Intelectual — nivel 2',
      });
      expect(within(card).queryByText('Propiedad Intelectual')).toBeNull();
    });
  });

  describe('does not infer bottleneck when the server field is absent', () => {
    it('does not render the bottleneck card from dimensionResults alone', () => {
      render(<MaturityProfileSummary dimensionResults={PAYFLOW} />);
      expect(screen.queryByText('Cuello de botella')).not.toBeInTheDocument();
    });
  });
});

// ── Empty state ───────────────────────────────────────────────────────────────

describe('empty state', () => {
  it('shows fallback message when dimensionResults is empty', () => {
    render(<MaturityProfileSummary dimensionResults={[]} />);
    expect(screen.getByText('Sin datos para resumir todavía.')).toBeInTheDocument();
  });

  it('does not render summary cards in empty state', () => {
    render(<MaturityProfileSummary dimensionResults={[]} />);
    expect(screen.queryByText('Fortaleza clara')).not.toBeInTheDocument();
    expect(screen.queryByText('Cuello de botella')).toBeNull();
  });
});

// ── Strength card ─────────────────────────────────────────────────────────────

describe('Strength card', () => {
  it('shows a single strength dimension with its level', () => {
    render(
      <MaturityProfileSummary
        dimensionResults={PAYFLOW}
        strength={{ dimensions: ['TRL'], level: 5 }}
      />,
    );
    const card = screen.getByRole('group', { name: /Fortaleza clara/i });
    expect(within(card).getByText(/Tecnología — nivel 5/i)).toBeInTheDocument();
  });

  it('shows tied count and level when multiple dimensions share the maximum', () => {
    render(
      <MaturityProfileSummary
        dimensionResults={UNIFORM}
        strength={{ dimensions: ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'], level: 6 }}
      />,
    );
    const card = screen.getByRole('group', { name: /Fortaleza clara/i });
    expect(within(card).getByText(/6 dimensiones empatadas en nivel 6/i)).toBeInTheDocument();
  });

  it('lists all tied names when there is a tie', () => {
    const tied: readonly DimensionResult[] = [
      dr('TRL', 7),
      dr('CRL', 7),
      dr('BRL', 4),
      dr('IPRL', 4),
      dr('TmRL', 4),
      dr('FRL', 4),
    ];
    render(
      <MaturityProfileSummary
        dimensionResults={tied}
        strength={{ dimensions: ['TRL', 'CRL'], level: 7 }}
      />,
    );
    const card = screen.getByRole('group', { name: /Fortaleza clara/i });
    expect(within(card).getByText('Tecnología')).toBeInTheDocument();
    expect(within(card).getByText('Cliente')).toBeInTheDocument();
  });
});

// ── Asymmetry card ────────────────────────────────────────────────────────────

describe('Asymmetry card', () => {
  it('shows asymmetry = 3 for PayFlow (TRL 5 − IPRL 2)', () => {
    render(
      <MaturityProfileSummary
        dimensionResults={PAYFLOW}
        asymmetry={{ difference: 3, classification: 'moderate' }}
      />,
    );
    const card = screen.getByRole('group', { name: /Asimetría/i });
    expect(within(card).getByText(/3 niveles/i)).toBeInTheDocument();
  });

  it('shows 0 asymmetry for uniform levels', () => {
    render(
      <MaturityProfileSummary
        dimensionResults={UNIFORM}
        asymmetry={{ difference: 0, classification: 'acceptable' }}
      />,
    );
    const card = screen.getByRole('group', { name: /Asimetría/i });
    expect(within(card).getByText(/0 niveles/i)).toBeInTheDocument();
  });

  it('says the profile advances evenly for acceptable asymmetry', () => {
    render(
      <MaturityProfileSummary
        dimensionResults={UNIFORM}
        asymmetry={{ difference: 0, classification: 'acceptable' }}
      />,
    );
    const card = screen.getByRole('group', { name: /Asimetría/i });
    expect(within(card).getByText(/avanza de forma pareja/i)).toBeInTheDocument();
  });

  it('says the gap is very large for a critical asymmetry', () => {
    render(
      <MaturityProfileSummary
        dimensionResults={EXTREME}
        asymmetry={{ difference: 8, classification: 'critical' }}
      />,
    );
    const card = screen.getByRole('group', { name: /Asimetría/i });
    expect(within(card).getByText(/diferencia muy grande/i)).toBeInTheDocument();
  });

  it('says the gap is important for a moderate asymmetry', () => {
    render(
      <MaturityProfileSummary
        dimensionResults={PAYFLOW}
        asymmetry={{ difference: 3, classification: 'moderate' }}
      />,
    );
    const card = screen.getByRole('group', { name: /Asimetría/i });
    expect(within(card).getByText(/diferencia importante/i)).toBeInTheDocument();
  });

  it('uses singular "nivel" when asymmetry is 1', () => {
    const oneApart: readonly DimensionResult[] = [
      dr('TRL', 5),
      dr('CRL', 4),
      dr('BRL', 5),
      dr('IPRL', 5),
      dr('TmRL', 5),
      dr('FRL', 5),
    ];
    render(
      <MaturityProfileSummary
        dimensionResults={oneApart}
        asymmetry={{ difference: 1, classification: 'acceptable' }}
      />,
    );
    const card = screen.getByRole('group', { name: /Asimetría/i });
    expect(within(card).getByText(/1 nivel entre/i)).toBeInTheDocument();
  });
});

// ── Gap card (≤ 3) ────────────────────────────────────────────────────────────

describe('Gap card (server-provided gaps)', () => {
  const PAYFLOW_GAPS = {
    dimensions: ['CRL', 'BRL', 'IPRL', 'FRL'] as DimensionCode[],
    threshold: 3,
  };

  it('appears when the server reports at least one gap dimension', () => {
    render(
      <MaturityProfileSummary dimensionResults={PAYFLOW} gaps={{ ...PAYFLOW_GAPS }} />,
    );
    expect(screen.getByRole('group', { name: /Brecha/i })).toBeInTheDocument();
  });

  it('does not appear when the server reports no gaps, even if levels are ≤ 3', () => {
    render(
      <MaturityProfileSummary
        dimensionResults={PAYFLOW}
        gaps={{ dimensions: [], threshold: 3 }}
      />,
    );
    expect(screen.queryByRole('group', { name: /Brecha/i })).not.toBeInTheDocument();
  });

  it('does not derive gaps from dimensionResults when the server field is absent', () => {
    render(<MaturityProfileSummary dimensionResults={PAYFLOW} />);
    expect(screen.queryByRole('group', { name: /Brecha/i })).not.toBeInTheDocument();
  });

  it('lists the Spanish names of gap dimensions from the server list', () => {
    render(
      <MaturityProfileSummary dimensionResults={PAYFLOW} gaps={{ ...PAYFLOW_GAPS }} />,
    );
    const card = screen.getByRole('group', { name: /Brecha/i });
    expect(within(card).getByText('Propiedad Intelectual')).toBeInTheDocument();
  });

  it('states the threshold supplied by the server in words, without symbols', () => {
    render(
      <MaturityProfileSummary dimensionResults={PAYFLOW} gaps={{ ...PAYFLOW_GAPS }} />,
    );
    expect(screen.getByText('4 dimensiones en nivel 3 o menos')).toBeInTheDocument();
    expect(screen.queryByText(/≤/)).not.toBeInTheDocument();
  });
});

// ── Imbalance pairs card ──────────────────────────────────────────────────────

// ── Fase 8c: pairs and critical state are not part of the profile ─────────────

describe('what the summary no longer shows (deep analysis only)', () => {
  it('has no imbalance pairs card, whatever the profile', () => {
    render(<MaturityProfileSummary dimensionResults={EXTREME} gaps={{ dimensions: [], threshold: 3 }} />);

    expect(screen.queryByText(/Pares desequilibrados/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pares/i)).not.toBeInTheDocument();
  });
});

// ── Fase 8c, Oleada 4: technical terms are explained ──────────────────────────

describe('glossary tooltips', () => {
  it.each([
    ['Cuello de botella', /la dimensión donde tu iniciativa está menos avanzada/i],
    ['Brecha', /parte más baja de la escala/i],
    ['Asimetría', /la distancia entre tu dimensión más avanzada y la menos avanzada/i],
  ])('explains "%s" in one plain sentence on hover', async (term, explanation) => {
    const user = userEvent.setup();
    render(
      <MaturityProfileSummary
        dimensionResults={PAYFLOW}
        bottleneck={{ dimensions: ['IPRL'], level: 2 }}
        asymmetry={{ difference: 3, classification: 'moderate' }}
        gaps={{ dimensions: ['CRL', 'IPRL'], threshold: 3 }}
      />,
    );

    await user.hover(screen.getByRole('button', { name: new RegExp(term, 'i') }));

    expect((await screen.findAllByText(explanation)).length).toBeGreaterThan(0);
  });

  it('makes the term reachable by keyboard, not only by mouse', async () => {
    const user = userEvent.setup();
    render(
      <MaturityProfileSummary
        dimensionResults={PAYFLOW}
        bottleneck={{ dimensions: ['IPRL'], level: 2 }}
      />,
    );

    // Without a highlight handler the card is not a tab stop: the first one is the term.
    await user.tab();

    expect(screen.getByRole('button', { name: /Cuello de botella/i })).toHaveFocus();
    expect((await screen.findAllByText(/menos avanzada/i)).length).toBeGreaterThan(0);
  });
});

// ── Fase 8c, Oleada 5: cards link to the radar ────────────────────────────────

describe('cards highlight their dimensions in the radar', () => {
  it('reports the bottleneck dimensions on hover and clears them on leave', async () => {
    const user = userEvent.setup();
    const onHighlight = vi.fn();
    render(
      <MaturityProfileSummary
        dimensionResults={PAYFLOW}
        bottleneck={{ dimensions: ['IPRL'], level: 2 }}
        onHighlight={onHighlight}
      />,
    );
    const card = screen.getByRole('group', { name: /Cuello de botella/i });

    await user.hover(card);
    expect(onHighlight).toHaveBeenLastCalledWith(['IPRL']);

    await user.unhover(card);
    expect(onHighlight).toHaveBeenLastCalledWith([]);
  });

  it('reports every gap dimension for the gap card', async () => {
    const user = userEvent.setup();
    const onHighlight = vi.fn();
    render(
      <MaturityProfileSummary
        dimensionResults={PAYFLOW}
        gaps={{ dimensions: ['CRL', 'BRL', 'IPRL', 'FRL'], threshold: 3 }}
        onHighlight={onHighlight}
      />,
    );

    await user.hover(screen.getByRole('group', { name: /Brecha/i }));

    expect(onHighlight).toHaveBeenLastCalledWith(['CRL', 'BRL', 'IPRL', 'FRL']);
  });

  it('also reacts to keyboard focus, so it does not depend on the mouse', async () => {
    const user = userEvent.setup();
    const onHighlight = vi.fn();
    render(
      <MaturityProfileSummary
        dimensionResults={PAYFLOW}
        strength={{ dimensions: ['TRL'], level: 5 }}
        onHighlight={onHighlight}
      />,
    );

    await user.tab();

    expect(onHighlight).toHaveBeenLastCalledWith(['TRL']);
  });

  it('is inert without a handler: cards are not tab stops', () => {
    render(
      <MaturityProfileSummary
        dimensionResults={PAYFLOW}
        strength={{ dimensions: ['TRL'], level: 5 }}
      />,
    );

    expect(screen.getByRole('group', { name: /Fortaleza/i })).not.toHaveAttribute('tabindex');
  });
});
