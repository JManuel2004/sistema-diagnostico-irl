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

function profile(over: Partial<MaturityProfileResponse> = {}): MaturityProfileResponse {
  return {
    diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    computedAt: '2026-01-01T00:00:00.000Z',
    dimensionResults: CODES.map((c) => dimensionResultFixture(c, 5)),
    bottleneck: { dimensions: ['TRL'], level: 5 },
    strength: { dimensions: ['TRL'], level: 5 },
    asymmetry: { difference: 0, classification: 'acceptable' },
    gaps: { dimensions: [], threshold: 3 },
    criticalState: { dimensions: [] },
    imbalances: [
      pair('TRL', 'CRL', 1, 'acceptable'),
      pair('TRL', 'BRL', 4, 'critical'),
      pair('CRL', 'BRL', 2, 'moderate'),
      pair('TmRL', 'FRL', 1, 'acceptable'),
      pair('BRL', 'IPRL', 1, 'acceptable'),
      pair('TRL', 'IPRL', 1, 'acceptable'),
    ],
    ...over,
  };
}

describe('ImbalanceInsights — pairs', () => {
  it('shows the flagged pairs with the names from the response, critical first', () => {
    render(<ImbalanceInsights profile={profile()} />);

    const card = screen.getByRole('group', { name: /Pares desequilibrados/ });
    expect(within(card).getByText(/2 de 6 pares fuera de balance/)).toBeInTheDocument();
    expect(within(card).getAllByText(/Tecnología/).length).toBeGreaterThan(0);
    expect(within(card).getByText(/Diferencia de 4 · crítico/)).toBeInTheDocument();
    expect(within(card).getByText(/Diferencia de 2 · moderado/)).toBeInTheDocument();
  });

  it('says so when every pair is within the acceptable range', () => {
    render(
      <ImbalanceInsights
        profile={profile({
          imbalances: [
            pair('TRL', 'CRL', 0, 'acceptable'),
            pair('TRL', 'BRL', 0, 'acceptable'),
            pair('CRL', 'BRL', 0, 'acceptable'),
            pair('TmRL', 'FRL', 0, 'acceptable'),
            pair('BRL', 'IPRL', 0, 'acceptable'),
            pair('TRL', 'IPRL', 0, 'acceptable'),
          ],
        })}
      />,
    );

    expect(
      screen.getByText(/Los 6 pares se mantienen dentro del rango aceptable/),
    ).toBeInTheDocument();
  });

  it('explains "desequilibrio" in plain words', async () => {
    const user = userEvent.setup();
    render(<ImbalanceInsights profile={profile()} />);

    await user.hover(screen.getByRole('button', { name: /Desequilibrios/ }));

    expect(
      (await screen.findAllByText(/dos dimensiones que deberían avanzar juntas/i)).length,
    ).toBeGreaterThan(0);
  });

  it('highlights the two dimensions of a pair on hover', async () => {
    const user = userEvent.setup();
    const onHighlight = vi.fn();
    render(<ImbalanceInsights profile={profile()} onHighlight={onHighlight} />);

    await user.hover(screen.getByText(/Diferencia de 4/));

    expect(onHighlight).toHaveBeenLastCalledWith(['TRL', 'BRL']);
  });
});

describe('ImbalanceInsights — critical state (RF-13)', () => {
  it('raises an alert for each critical dimension, named from the response', () => {
    render(
      <ImbalanceInsights profile={profile({ criticalState: { dimensions: ['BRL', 'TmRL'] } })} />,
    );

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toHaveTextContent('Negocio está en estado crítico');
    expect(alerts[1]).toHaveTextContent('Equipo está en estado crítico');
  });

  it('says none is critical when the backend reports none, without raising an alert', () => {
    render(<ImbalanceInsights profile={profile()} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/Ninguna dimensión clave está en estado crítico/)).toBeInTheDocument();
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

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains "estado crítico" in plain words', async () => {
    const user = userEvent.setup();
    render(<ImbalanceInsights profile={profile()} />);

    await user.hover(screen.getByRole('button', { name: /estado crítico/i }));

    expect(
      (await screen.findAllByText(/una brecha en una dimensión clave/i)).length,
    ).toBeGreaterThan(0);
  });

  it('highlights the critical dimension in the radar on hover', async () => {
    const user = userEvent.setup();
    const onHighlight = vi.fn();
    render(
      <ImbalanceInsights
        profile={profile({ criticalState: { dimensions: ['BRL'] } })}
        onHighlight={onHighlight}
      />,
    );

    await user.hover(screen.getByRole('alert'));

    expect(onHighlight).toHaveBeenLastCalledWith(['BRL']);
  });
});
