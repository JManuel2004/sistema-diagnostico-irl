import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DimensionResult, ImbalancePairResult } from '@innlab/contracts';
import {
  buildImbalancedVertices,
  MaturityRadarChart,
  severityColorForLevel,
} from '../MaturityRadarChart';

// ── Helper ────────────────────────────────────────────────────────────────────

function dr(code: DimensionResult['dimensionCode'], level: number): DimensionResult {
  return { dimensionCode: code, name: code, averageLikert: level, irlLevel: level };
}

const ALL_SIX: readonly DimensionResult[] = [
  dr('TRL', 5),
  dr('CRL', 3),
  dr('BRL', 3),
  dr('IPRL', 2),
  dr('TmRL', 4),
  dr('FRL', 3),
];

// ── severityColorForLevel ─────────────────────────────────────────────────────

describe('severityColorForLevel', () => {
  it.each([
    [1, 'var(--color-critical, #A53221)'],
    [3, 'var(--color-critical, #A53221)'],
    [4, 'var(--color-moderate, #8C3811)'],
    [5, 'var(--color-moderate, #8C3811)'],
    [6, 'var(--color-acceptable, #1F633D)'],
    [9, 'var(--color-acceptable, #1F633D)'],
  ])('level %i → %s', (level, expected) => {
    expect(severityColorForLevel(level)).toBe(expected);
  });

  it('boundary: level 3 is critical, level 4 is moderate', () => {
    expect(severityColorForLevel(3)).toBe('var(--color-critical, #A53221)');
    expect(severityColorForLevel(4)).toBe('var(--color-moderate, #8C3811)');
  });

  it('boundary: level 5 is moderate, level 6 is acceptable', () => {
    expect(severityColorForLevel(5)).toBe('var(--color-moderate, #8C3811)');
    expect(severityColorForLevel(6)).toBe('var(--color-acceptable, #1F633D)');
  });
});

// ── buildImbalancedVertices ───────────────────────────────────────────────────

describe('buildImbalancedVertices', () => {
  function pointsMap(levels: Record<string, number>) {
    const map = new Map<string, { dimension: string; code: string; level: number; averageLikert: number }>();
    for (const [code, level] of Object.entries(levels)) {
      map.set(code, { dimension: code, code, level, averageLikert: level });
    }
    return map;
  }

  function imbalance(
    left: string,
    right: string,
    difference: number,
    classification: ImbalancePairResult['classification'],
  ): ImbalancePairResult {
    return { left: left as ImbalancePairResult['left'], right: right as ImbalancePairResult['right'], difference, classification };
  }

  it('returns empty map when no imbalances supplied', () => {
    const map = buildImbalancedVertices(undefined, pointsMap({ TRL: 5, CRL: 3 }));
    expect(map.size).toBe(0);
  });

  it('skips acceptable pairs — they produce no vertex entry', () => {
    const map = buildImbalancedVertices(
      [imbalance('TRL', 'CRL', 1, 'acceptable')],
      pointsMap({ TRL: 5, CRL: 4 }),
    );
    expect(map.size).toBe(0);
  });

  it('marks the higher-level dimension for a moderate pair', () => {
    const map = buildImbalancedVertices(
      [imbalance('TRL', 'CRL', 2, 'moderate')],
      pointsMap({ TRL: 5, CRL: 3 }),
    );
    expect(map.get('TRL')).toBe('moderate');
    expect(map.has('CRL')).toBe(false);
  });

  it('marks the higher-level dimension for a critical pair', () => {
    const map = buildImbalancedVertices(
      [imbalance('TmRL', 'FRL', 5, 'critical')],
      pointsMap({ TmRL: 8, FRL: 3 }),
    );
    expect(map.get('TmRL')).toBe('critical');
    expect(map.has('FRL')).toBe(false);
  });

  it('escalates from moderate to critical when a dimension appears in multiple flagged pairs', () => {
    const map = buildImbalancedVertices(
      [
        imbalance('TRL', 'CRL', 2, 'moderate'),
        imbalance('TRL', 'BRL', 5, 'critical'),
      ],
      pointsMap({ TRL: 8, CRL: 6, BRL: 3 }),
    );
    expect(map.get('TRL')).toBe('critical');
  });

  it('does not downgrade critical to moderate', () => {
    const map = buildImbalancedVertices(
      [
        imbalance('TRL', 'BRL', 5, 'critical'),
        imbalance('TRL', 'CRL', 2, 'moderate'),
      ],
      pointsMap({ TRL: 8, BRL: 3, CRL: 6 }),
    );
    expect(map.get('TRL')).toBe('critical');
  });

  it('right side becomes vertex when it has the higher level', () => {
    const map = buildImbalancedVertices(
      [imbalance('CRL', 'TRL', 3, 'moderate')],
      pointsMap({ CRL: 2, TRL: 5 }),
    );
    expect(map.get('TRL')).toBe('moderate');
    expect(map.has('CRL')).toBe(false);
  });

  it('on a tie both dimensions have equal levels — left wins', () => {
    const map = buildImbalancedVertices(
      [imbalance('TRL', 'CRL', 0, 'moderate')],
      pointsMap({ TRL: 5, CRL: 5 }),
    );
    // left wins the tie (la >= lb)
    expect(map.get('TRL')).toBe('moderate');
  });
});

// ── MaturityRadarChart (smoke tests) ──────────────────────────────────────────

describe('MaturityRadarChart', () => {
  it('renders the accessible container with the correct role and label', () => {
    render(<MaturityRadarChart dimensionResults={ALL_SIX} />);
    expect(
      screen.getByRole('img', { name: 'Perfil IRL — gráfico radar' }),
    ).toBeInTheDocument();
  });

  it('renders without throwing when imbalances is undefined', () => {
    expect(() =>
      render(<MaturityRadarChart dimensionResults={ALL_SIX} />),
    ).not.toThrow();
  });

  it('renders without throwing when all imbalances are acceptable', () => {
    const allAcceptable: ImbalancePairResult[] = [
      { left: 'TRL', right: 'CRL', difference: 1, classification: 'acceptable' },
      { left: 'TRL', right: 'BRL', difference: 0, classification: 'acceptable' },
      { left: 'CRL', right: 'BRL', difference: 1, classification: 'acceptable' },
      { left: 'TmRL', right: 'FRL', difference: 1, classification: 'acceptable' },
      { left: 'BRL', right: 'IPRL', difference: 0, classification: 'acceptable' },
      { left: 'TRL', right: 'IPRL', difference: 1, classification: 'acceptable' },
    ];
    expect(() =>
      render(<MaturityRadarChart dimensionResults={ALL_SIX} imbalances={allAcceptable} />),
    ).not.toThrow();
  });

  it('renders without throwing when a critical imbalance is present', () => {
    const withCritical: ImbalancePairResult[] = [
      { left: 'TmRL', right: 'FRL', difference: 5, classification: 'critical' },
    ];
    expect(() =>
      render(<MaturityRadarChart dimensionResults={ALL_SIX} imbalances={withCritical} />),
    ).not.toThrow();
  });

  it('renders without throwing when a moderate imbalance is present', () => {
    const withModerate: ImbalancePairResult[] = [
      { left: 'TRL', right: 'CRL', difference: 2, classification: 'moderate' },
    ];
    expect(() =>
      render(<MaturityRadarChart dimensionResults={ALL_SIX} imbalances={withModerate} />),
    ).not.toThrow();
  });
});
