import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  DimensionCode,
  ImbalancePairResult,
  MaturityProfileResponse,
} from '@innlab/contracts';
import { dimensionResultFixture } from '@/test/fixtures/dimensions';
import { ImbalanceInsights } from '../ImbalanceInsights';

const CODES: DimensionCode[] = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'];

function pair(
  left: DimensionCode,
  right: DimensionCode,
  difference: number,
  classification: ImbalancePairResult['classification'],
): ImbalancePairResult {
  return { left, right, difference, classification };
}

/** Levels: Tecnología 8, Cliente 6, Negocio 4, Propiedad intelectual 3, Equipo 5, Financiación 3. */
const LEVELS: Record<DimensionCode, number> = { TRL: 8, CRL: 6, BRL: 4, IPRL: 3, TmRL: 5, FRL: 3 };

function profile(over: Partial<MaturityProfileResponse> = {}): MaturityProfileResponse {
  return {
    diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    computedAt: '2026-01-01T00:00:00.000Z',
    dimensionResults: CODES.map((c) => dimensionResultFixture(c, LEVELS[c])),
    globalAverage: 4.8,
    bottleneck: { dimensions: ['IPRL', 'FRL'], level: 3 },
    strength: { dimensions: ['TRL'], level: 8 },
    asymmetry: { difference: 5, classification: 'critical' },
    gaps: { dimensions: [], threshold: 3 },
    criticalState: { dimensions: [] },
    imbalances: [
      pair('TRL', 'CRL', 2, 'moderate'),
      pair('TRL', 'BRL', 4, 'critical'),
      pair('CRL', 'BRL', 2, 'moderate'),
      pair('TmRL', 'FRL', 2, 'moderate'),
      pair('BRL', 'IPRL', 1, 'acceptable'),
      pair('TRL', 'IPRL', 5, 'critical'),
    ],
    ...over,
  };
}

const pairsSection = () => screen.getByRole('region', { name: /Qué tan parejo avanza/ });
const alertsSection = () => screen.getByRole('region', { name: /Qué atender primero/ });

describe('ImbalanceInsights — pairs', () => {
  it('shows all six pairs, the most serious first', () => {
    render(<ImbalanceInsights profile={profile()} />);

    const cards = within(pairsSection()).getAllByRole('article');
    expect(cards).toHaveLength(6);
    // Critical (difference 5, then 4), then moderate, then the balanced one.
    expect(cards.map((c) => c.getAttribute('aria-label'))).toEqual([
      'Tecnología y Propiedad Intelectual: desequilibrio crítico',
      'Tecnología y Negocio: desequilibrio crítico',
      'Tecnología y Cliente: desequilibrio moderado',
      'Cliente y Negocio: desequilibrio moderado',
      'Equipo y Financiación: desequilibrio moderado',
      'Negocio y Propiedad Intelectual: equilibrado',
    ]);
  });

  it('summarizes how many pairs are critical, moderate and balanced', () => {
    render(<ImbalanceInsights profile={profile()} />);

    const summary = screen.getByLabelText('Resumen de los pares');
    expect(summary).toHaveTextContent('2 críticos');
    expect(summary).toHaveTextContent('3 moderados');
    expect(summary).toHaveTextContent('1 equilibrado');
  });

  it('says in words how far apart the two dimensions are and which one leads', () => {
    render(<ImbalanceInsights profile={profile()} />);

    const card = screen.getByRole('article', { name: /Tecnología y Negocio/ });
    expect(within(card).getByText('Tecnología va 4 niveles por delante de Negocio.')).toBeInTheDocument();
    expect(within(card).getByText(/Conviene atender Negocio antes de seguir avanzando en Tecnología/)).toBeInTheDocument();
    expect(within(card).getByText('Desequilibrio crítico')).toBeInTheDocument();
  });

  it('gives each dimension of the pair its level and a bar', () => {
    render(<ImbalanceInsights profile={profile()} />);

    const card = screen.getByRole('article', { name: /Tecnología y Negocio/ });
    expect(within(card).getByRole('img', { name: 'Nivel 8 de 9' })).toBeInTheDocument();
    expect(within(card).getByRole('img', { name: 'Nivel 4 de 9' })).toBeInTheDocument();
  });

  it('when both dimensions are in a gap it asks to raise them together, not to hold one back', () => {
    render(
      <ImbalanceInsights
        profile={profile({ gaps: { dimensions: ['TmRL', 'FRL'], threshold: 3 } })}
      />,
    );

    const card = screen.getByRole('article', { name: /Equipo y Financiación/ });
    expect(card).toHaveTextContent('subir Equipo y Financiación en paralelo');
  });

  it('tells a balanced pair that nothing has to be held back', () => {
    render(<ImbalanceInsights profile={profile()} />);

    const card = screen.getByRole('article', { name: /Negocio y Propiedad Intelectual/ });
    expect(card).toHaveTextContent('Las dos avanzan a un ritmo parecido');
    expect(within(card).getByText('Equilibrado')).toBeInTheDocument();
  });

  it('uses no arrows, deltas or codes: the texts say the same in plain words', () => {
    render(<ImbalanceInsights profile={profile()} />);

    const text = pairsSection().textContent ?? '';
    expect(text).not.toMatch(/[→⇄⇔↔Δ≤≥]/);
    expect(text).not.toMatch(/\b(TRL|CRL|BRL|IPRL|TmRL|FRL)\b/);
  });

  it('shows an empty message when there are no pairs to evaluate', () => {
    render(<ImbalanceInsights profile={profile({ imbalances: undefined })} />);

    expect(screen.getByText('No hay pares para evaluar todavía.')).toBeInTheDocument();
  });

  it('addresses the initiative by name in the title', () => {
    render(<ImbalanceInsights profile={profile()} subject="AgroConecta" />);

    expect(
      screen.getByRole('heading', { name: 'Qué tan parejo avanza AgroConecta' }),
    ).toBeInTheDocument();
  });

  it('explains "desequilibrio" in plain words', async () => {
    const user = userEvent.setup();
    render(<ImbalanceInsights profile={profile()} />);

    await user.hover(screen.getByRole('button', { name: /desequilibrio/i }));

    expect(
      (await screen.findAllByText(/dos dimensiones que deberían avanzar juntas/i)).length,
    ).toBeGreaterThan(0);
  });

  it('highlights the two dimensions of a pair on hover and clears them on leave', async () => {
    const user = userEvent.setup();
    const onHighlight = vi.fn();
    render(<ImbalanceInsights profile={profile()} onHighlight={onHighlight} />);
    const card = screen.getByRole('article', { name: /Tecnología y Negocio/ });

    await user.hover(card);
    expect(onHighlight).toHaveBeenLastCalledWith(['TRL', 'BRL']);

    await user.unhover(card);
    expect(onHighlight).toHaveBeenLastCalledWith([]);
  });
});

describe('ImbalanceInsights — critical state (RF-13)', () => {
  const critical = () =>
    profile({
      gaps: { dimensions: ['CRL', 'BRL', 'IPRL', 'FRL'], threshold: 3 },
      criticalState: { dimensions: ['CRL', 'BRL'] },
    });

  it('gives each critical dimension its own prominent card, named from the response', () => {
    render(<ImbalanceInsights profile={critical()} />);

    const cards = within(alertsSection()).getAllByRole('article');
    expect(cards.map((c) => c.getAttribute('aria-label'))).toEqual([
      'Cliente está en estado crítico',
      'Negocio está en estado crítico',
    ]);
    for (const card of cards) {
      expect(within(card).getByText('Prioridad máxima')).toBeInTheDocument();
    }
  });

  it('shows the level of the critical dimension, with a bar and what it measures', () => {
    render(
      <ImbalanceInsights
        profile={critical()}
        descriptions={{ BRL: 'Qué tan claro y rentable es el modelo de negocio.' }}
      />,
    );

    const card = screen.getByRole('article', { name: 'Negocio está en estado crítico' });
    expect(within(card).getByText('Nivel 4')).toBeInTheDocument();
    expect(within(card).getByRole('img', { name: 'Nivel 4 de 9' })).toBeInTheDocument();
    expect(
      within(card).getByText('Qué tan claro y rentable es el modelo de negocio.'),
    ).toBeInTheDocument();
  });

  it('says the next step from the plan when the roadmap already has the dimension', () => {
    render(
      <ImbalanceInsights
        profile={critical()}
        plan={{ BRL: { targetLevel: 6, phase: 2 } }}
      />,
    );

    const card = screen.getByRole('article', { name: 'Negocio está en estado crítico' });
    expect(card).toHaveTextContent('Siguiente paso: Subir del nivel 4 al nivel 6, en la fase 2 del plan.');
  });

  it('still says what to do when the plan is not there yet', () => {
    render(<ImbalanceInsights profile={critical()} />);

    const card = screen.getByRole('article', { name: 'Negocio está en estado crítico' });
    expect(card).toHaveTextContent('Conviene atenderla antes que el resto');
  });

  it('lists the other dimensions in a gap as a lower, «prioridad media» priority', () => {
    render(<ImbalanceInsights profile={critical()} />);

    const heading = screen.getByRole('heading', { name: /Otras dimensiones en la parte baja/ });
    expect(heading).toHaveTextContent('Prioridad media');
    const rows = within(alertsSection()).getAllByRole('listitem').filter((li) =>
      /Propiedad Intelectual|Financiación/.test(li.textContent ?? ''),
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it('says none is critical when the backend reports none, without an alarming card', () => {
    render(<ImbalanceInsights profile={profile()} />);

    expect(screen.getByText(/Ninguna dimensión clave está en estado crítico/)).toBeInTheDocument();
    expect(within(alertsSection()).queryByText('Prioridad máxima')).not.toBeInTheDocument();
  });

  it('does not treat a gap as a critical state: it only shows what the backend calls critical', () => {
    render(
      <ImbalanceInsights
        profile={profile({
          gaps: { dimensions: ['TRL', 'IPRL'], threshold: 3 },
          criticalState: { dimensions: [] },
        })}
      />,
    );

    expect(screen.queryByText('Prioridad máxima')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Otras dimensiones en la parte baja/ })).toBeInTheDocument();
  });

  it('explains the threshold in words, without symbols', () => {
    render(<ImbalanceInsights profile={critical()} />);

    const text = alertsSection().textContent ?? '';
    expect(text).toContain('cuando están en nivel 3 o menos');
    expect(text).not.toMatch(/[→≤≥]/);
  });

  it('addresses the initiative by name', () => {
    render(<ImbalanceInsights profile={critical()} subject="AgroConecta" />);

    expect(screen.getByRole('heading', { name: 'Qué atender primero en AgroConecta' })).toBeInTheDocument();
  });

  it('explains "críticas" in plain words', async () => {
    const user = userEvent.setup();
    render(<ImbalanceInsights profile={profile()} />);

    await user.hover(screen.getByRole('button', { name: /críticas/i }));

    expect(
      (await screen.findAllByText(/una brecha en una dimensión clave/i)).length,
    ).toBeGreaterThan(0);
  });

  it('highlights the critical dimension in the radar on hover', async () => {
    const user = userEvent.setup();
    const onHighlight = vi.fn();
    render(<ImbalanceInsights profile={critical()} onHighlight={onHighlight} />);

    await user.hover(screen.getByRole('article', { name: 'Negocio está en estado crítico' }));

    expect(onHighlight).toHaveBeenLastCalledWith(['BRL']);
  });
});
