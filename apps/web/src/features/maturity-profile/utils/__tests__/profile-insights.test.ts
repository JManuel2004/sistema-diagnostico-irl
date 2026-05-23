import { describe, expect, it } from 'vitest';
import type { DimensionResult } from '@innlab/contracts';
import {
  classifyImbalance,
  computeProfileInsights,
  KTH_IMBALANCE_PAIRS,
} from '../profile-insights';

/** Helper para armar un `DimensionResult` corto. */
const dr = (code: string, level: number): DimensionResult => ({
  dimensionCode: code as DimensionResult['dimensionCode'],
  name: code,
  averageLikert: level,
  irlLevel: level,
});

/** Perfil sintético de PayFlow (de la guía KTH p. 22) usado para validar. */
const PAYFLOW: readonly DimensionResult[] = [
  dr('TRL', 5),
  dr('CRL', 3),
  dr('BRL', 3),
  dr('IPRL', 2),
  dr('TmRL', 4),
  dr('FRL', 3),
];

describe('classifyImbalance (KTH rules: >3 critical, 2-3 moderate, <2 acceptable)', () => {
  it.each([
    [0, 'acceptable'],
    [1, 'acceptable'],
    [1.9, 'acceptable'],
    [2, 'moderate'],
    [3, 'moderate'],
    [3.5, 'critical'],
    [4, 'critical'],
    [8, 'critical'],
  ])('difference=%s → %s', (diff, expected) => {
    expect(classifyImbalance(diff)).toBe(expected);
  });
});

describe('computeProfileInsights', () => {
  describe('PayFlow case (KTH guide p. 22)', () => {
    const insights = computeProfileInsights(PAYFLOW);

    it('strength = TRL at level 5', () => {
      expect(insights.strength.level).toBe(5);
      expect(insights.strength.dimensions).toEqual(['TRL']);
    });

    it('bottleneck = IPRL at level 2', () => {
      expect(insights.bottleneck.level).toBe(2);
      expect(insights.bottleneck.dimensions).toEqual(['IPRL']);
    });

    it('asymmetry = 3 (TRL 5 − IPRL 2)', () => {
      expect(insights.asymmetry).toBe(3);
    });

    it('gapDimensions includes all ≤ 3 (CRL, BRL, IPRL, FRL)', () => {
      expect([...insights.gapDimensions].sort()).toEqual(['BRL', 'CRL', 'FRL', 'IPRL']);
    });

    it('emits all 6 fixed imbalance pairs', () => {
      expect(insights.imbalances).toHaveLength(6);
      expect(insights.imbalances.map((i) => i.pair)).toEqual(KTH_IMBALANCE_PAIRS);
    });

    it.each([
      [['TRL', 'CRL'], 2, 'moderate'],
      [['TRL', 'BRL'], 2, 'moderate'],
      [['CRL', 'BRL'], 0, 'acceptable'],
      [['TmRL', 'FRL'], 1, 'acceptable'],
      [['BRL', 'IPRL'], 1, 'acceptable'],
      [['TRL', 'IPRL'], 3, 'moderate'],
    ])('pair %j → difference %i (%s)', (pair, diff, classification) => {
      const found = insights.imbalances.find((i) => i.pair[0] === pair[0] && i.pair[1] === pair[1]);
      expect(found).toBeDefined();
      expect(found?.difference).toBe(diff);
      expect(found?.classification).toBe(classification);
    });
  });

  describe('tied bottleneck (DIAGIRL-35 acceptance: include all tied dimensions)', () => {
    it('reports all 3 dimensions tied at the minimum', () => {
      const tied: readonly DimensionResult[] = [
        dr('TRL', 8),
        dr('CRL', 2),
        dr('BRL', 5),
        dr('IPRL', 2),
        dr('TmRL', 2),
        dr('FRL', 7),
      ];
      const insights = computeProfileInsights(tied);
      expect(insights.bottleneck.level).toBe(2);
      expect([...insights.bottleneck.dimensions].sort()).toEqual(['CRL', 'IPRL', 'TmRL']);
    });

    it('reports all 6 when every dimension is the same', () => {
      const uniform: readonly DimensionResult[] = [
        dr('TRL', 5),
        dr('CRL', 5),
        dr('BRL', 5),
        dr('IPRL', 5),
        dr('TmRL', 5),
        dr('FRL', 5),
      ];
      const insights = computeProfileInsights(uniform);
      expect(insights.bottleneck.dimensions).toHaveLength(6);
      expect(insights.strength.dimensions).toHaveLength(6);
      expect(insights.asymmetry).toBe(0);
    });
  });

  describe('critical asymmetry detection (level 1 vs level 9)', () => {
    it('asymmetry = 8, marks critical imbalances', () => {
      const extreme: readonly DimensionResult[] = [
        dr('TRL', 9),
        dr('CRL', 1),
        dr('BRL', 9),
        dr('IPRL', 1),
        dr('TmRL', 9),
        dr('FRL', 1),
      ];
      const insights = computeProfileInsights(extreme);
      expect(insights.asymmetry).toBe(8);
      const criticalCount = insights.imbalances.filter(
        (i) => i.classification === 'critical',
      ).length;
      // TRL-CRL=8, TRL-BRL=0, CRL-BRL=8, TmRL-FRL=8, BRL-IPRL=8, TRL-IPRL=8 → 5 critical
      expect(criticalCount).toBe(5);
    });
  });

  describe('degenerate inputs', () => {
    it('returns a safe zero-skeleton when results is empty', () => {
      const insights = computeProfileInsights([]);
      expect(insights.strength.level).toBe(0);
      expect(insights.bottleneck.level).toBe(0);
      expect(insights.asymmetry).toBe(0);
      expect(insights.gapDimensions).toEqual([]);
      expect(insights.imbalances).toEqual([]);
    });

    it('omits pairs where one side is missing (defense in depth)', () => {
      const partial: readonly DimensionResult[] = [
        dr('TRL', 5),
        dr('CRL', 3),
        // BRL, IPRL, TmRL, FRL missing
      ];
      const insights = computeProfileInsights(partial);
      // Only TRL-CRL is computable.
      expect(insights.imbalances).toHaveLength(1);
      expect(insights.imbalances[0].pair).toEqual(['TRL', 'CRL']);
    });
  });
});
