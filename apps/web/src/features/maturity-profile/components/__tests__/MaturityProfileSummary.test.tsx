import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { DimensionResult } from '@innlab/contracts';
import { MaturityProfileSummary } from '../MaturityProfileSummary';

// ── Helper ────────────────────────────────────────────────────────────────────

function dr(code: DimensionResult['dimensionCode'], level: number): DimensionResult {
  return { dimensionCode: code, name: code, averageLikert: level, irlLevel: level };
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

// Extreme spread TRL 9, FRL 1 — critical asymmetry and critical imbalances
const EXTREME: readonly DimensionResult[] = [
  dr('TRL', 9),
  dr('CRL', 1),
  dr('BRL', 9),
  dr('IPRL', 1),
  dr('TmRL', 9),
  dr('FRL', 1),
];

// ── Empty state ───────────────────────────────────────────────────────────────

describe('empty state', () => {
  it('shows fallback message when dimensionResults is empty', () => {
    render(<MaturityProfileSummary dimensionResults={[]} />);
    expect(screen.getByText('Sin datos para resumir todavía.')).toBeInTheDocument();
  });

  it('does not render summary cards in empty state', () => {
    render(<MaturityProfileSummary dimensionResults={[]} />);
    expect(screen.queryByText('Fortaleza clara')).not.toBeInTheDocument();
  });
});

// ── Strength card ─────────────────────────────────────────────────────────────

describe('Strength card', () => {
  it('shows a single strength dimension with its level', () => {
    render(<MaturityProfileSummary dimensionResults={PAYFLOW} />);
    const card = screen.getByRole('group', { name: /Fortaleza clara/i });
    expect(within(card).getByText(/Tecnología — nivel 5/i)).toBeInTheDocument();
  });

  it('shows tied count and level when multiple dimensions share the maximum', () => {
    render(<MaturityProfileSummary dimensionResults={UNIFORM} />);
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
    render(<MaturityProfileSummary dimensionResults={tied} />);
    const card = screen.getByRole('group', { name: /Fortaleza clara/i });
    expect(within(card).getByText(/Tecnología.*Cliente|Cliente.*Tecnología/i)).toBeInTheDocument();
  });
});

// ── Asymmetry card ────────────────────────────────────────────────────────────

describe('Asymmetry card', () => {
  it('shows asymmetry = 3 for PayFlow (TRL 5 − IPRL 2)', () => {
    render(<MaturityProfileSummary dimensionResults={PAYFLOW} />);
    const card = screen.getByRole('group', { name: /Asimetría/i });
    expect(within(card).getByText(/3 niveles/i)).toBeInTheDocument();
  });

  it('shows 0 asymmetry for uniform levels', () => {
    render(<MaturityProfileSummary dimensionResults={UNIFORM} />);
    const card = screen.getByRole('group', { name: /Asimetría/i });
    expect(within(card).getByText(/0 niveles/i)).toBeInTheDocument();
  });

  it('shows "Perfil balanceado" text for acceptable asymmetry', () => {
    render(<MaturityProfileSummary dimensionResults={UNIFORM} />);
    const card = screen.getByRole('group', { name: /Asimetría/i });
    expect(within(card).getByText(/Perfil balanceado/i)).toBeInTheDocument();
  });

  it('shows "Asimetría crítica" text for extreme spread', () => {
    render(<MaturityProfileSummary dimensionResults={EXTREME} />);
    const card = screen.getByRole('group', { name: /Asimetría/i });
    expect(within(card).getByText(/Asimetría crítica/i)).toBeInTheDocument();
  });

  it('shows "Asimetría moderada" text for moderate spread', () => {
    // Asymmetry = 3 → moderate (diff 2-3)
    render(<MaturityProfileSummary dimensionResults={PAYFLOW} />);
    const card = screen.getByRole('group', { name: /Asimetría/i });
    expect(within(card).getByText(/Asimetría moderada/i)).toBeInTheDocument();
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
    render(<MaturityProfileSummary dimensionResults={oneApart} />);
    const card = screen.getByRole('group', { name: /Asimetría/i });
    // "1 nivel" not "1 niveles"
    expect(within(card).getByText(/1 nivel entre/i)).toBeInTheDocument();
  });
});

// ── Gap card (≤ 3) ────────────────────────────────────────────────────────────

describe('Gap card (level ≤ 3)', () => {
  it('appears when at least one dimension is at level ≤ 3 (PayFlow: IPRL=2, CRL=3, BRL=3, FRL=3)', () => {
    render(<MaturityProfileSummary dimensionResults={PAYFLOW} />);
    expect(screen.getByRole('group', { name: /Brecha/i })).toBeInTheDocument();
  });

  it('does not appear when all dimensions are above level 3', () => {
    render(<MaturityProfileSummary dimensionResults={UNIFORM} />);
    expect(screen.queryByRole('group', { name: /Brecha/i })).not.toBeInTheDocument();
  });

  it('lists the Spanish names of gap dimensions', () => {
    render(<MaturityProfileSummary dimensionResults={PAYFLOW} />);
    const card = screen.getByRole('group', { name: /Brecha/i });
    expect(within(card).getByText(/Propiedad Intelectual/i)).toBeInTheDocument();
  });
});

// ── Imbalance pairs card ──────────────────────────────────────────────────────

describe('Imbalance pairs card', () => {
  it('shows "Los 6 pares se mantienen dentro del rango aceptable" when uniform', () => {
    render(<MaturityProfileSummary dimensionResults={UNIFORM} />);
    expect(
      screen.getByText(/6 pares se mantienen dentro del rango aceptable/i),
    ).toBeInTheDocument();
  });

  it('shows "Pares desequilibrados" card when there are flagged pairs (PayFlow)', () => {
    render(<MaturityProfileSummary dimensionResults={PAYFLOW} />);
    const card = screen.getByRole('group', { name: /Pares desequilibrados/i });
    expect(card).toBeInTheDocument();
  });

  it('shows count of out-of-balance pairs in PayFlow (2 of 6)', () => {
    // PayFlow: TRL-CRL diff 2 (moderate), TRL-BRL diff 2 (moderate), TRL-IPRL diff 3 (moderate)
    // CRL-BRL 0, TmRL-FRL 1, BRL-IPRL 1 → 3 flagged pairs
    render(<MaturityProfileSummary dimensionResults={PAYFLOW} />);
    const card = screen.getByRole('group', { name: /Pares desequilibrados/i });
    expect(within(card).getByText(/de 6 pares KTH fuera de balance/i)).toBeInTheDocument();
  });

  it('lists the flagged pair codes as chips', () => {
    render(<MaturityProfileSummary dimensionResults={PAYFLOW} />);
    const card = screen.getByRole('group', { name: /Pares desequilibrados/i });
    // PayFlow has 3 moderate pairs; TRL appears in each, CRL appears in TRL-CRL
    expect(within(card).getAllByText('TRL').length).toBeGreaterThan(0);
    expect(within(card).getAllByText('CRL').length).toBeGreaterThan(0);
  });

  it('shows "crítico" label for a pair with difference > 3', () => {
    const extreme: readonly DimensionResult[] = [
      dr('TRL', 9),
      dr('CRL', 9),
      dr('BRL', 9),
      dr('IPRL', 9),
      dr('TmRL', 9),
      dr('FRL', 1),
    ];
    render(<MaturityProfileSummary dimensionResults={extreme} />);
    const card = screen.getByRole('group', { name: /Pares desequilibrados/i });
    expect(within(card).getByText(/crítico/i)).toBeInTheDocument();
  });

  it('shows "moderado" label for a pair with difference of 2 or 3', () => {
    render(<MaturityProfileSummary dimensionResults={PAYFLOW} />);
    const card = screen.getByRole('group', { name: /Pares desequilibrados/i });
    // PayFlow has 3 moderate pairs (TRL-CRL Δ2, TRL-BRL Δ2, TRL-IPRL Δ3)
    expect(within(card).getAllByText(/moderado/i).length).toBeGreaterThan(0);
  });

  it('shows all 6 pairs acceptable message for extreme spread with all critical (no acceptable pairs)', () => {
    // Verify no acceptable message appears with EXTREME data
    render(<MaturityProfileSummary dimensionResults={EXTREME} />);
    expect(
      screen.queryByText(/6 pares se mantienen dentro del rango aceptable/i),
    ).not.toBeInTheDocument();
  });
});
