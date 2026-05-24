import { ImbalanceEvaluatorService } from '../../../../../../src/modules/maturity-profile/domain/services/imbalance-evaluator.service.js';
import { DimensionCode } from '../../../../../../src/shared-kernel/domain/value-objects/dimension-code.js';

function pair(id: number, left: string, right: string) {
  return {
    id,
    left: DimensionCode.create(left),
    right: DimensionCode.create(right),
    equals: () => false,
  };
}

const KTH_PAIRS = [
  pair(1, 'TRL', 'CRL'),
  pair(2, 'TRL', 'BRL'),
  pair(3, 'CRL', 'BRL'),
  pair(4, 'TmRL', 'FRL'),
  pair(5, 'BRL', 'IPRL'),
  pair(6, 'TRL', 'IPRL'),
];

// PayFlow levels: TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3
const PAYFLOW_LEVELS = new Map<string, number>([
  ['TRL', 5],
  ['CRL', 3],
  ['BRL', 3],
  ['IPRL', 2],
  ['TmRL', 4],
  ['FRL', 3],
]);

describe('ImbalanceEvaluatorService', () => {
  const svc = new ImbalanceEvaluatorService();

  // ── Classification thresholds ──────────────────────────────────────────────

  describe('classification boundaries (KTH rules)', () => {
    function evalPair(la: number, lb: number) {
      return svc.evaluate(new Map([['TRL', la], ['CRL', lb]]), [pair(1, 'TRL', 'CRL')])[0];
    }

    it.each([
      [5, 5, 0, 'ACEPTABLE'],
      [5, 4, 1, 'ACEPTABLE'],
      [5, 4, 1, 'ACEPTABLE'], // diff 1 → acceptable
      [5, 3, 2, 'MODERADO'],  // diff 2 → moderate (lower bound)
      [5, 2, 3, 'MODERADO'],  // diff 3 → moderate (upper bound)
      [5, 1, 4, 'CRITICO'],   // diff 4 → critical (lower bound of critical)
      [9, 1, 8, 'CRITICO'],   // diff 8 → critical (max possible)
    ])(
      'levels %i vs %i → diff %i → %s',
      (la, lb, expectedDiff, expectedClass) => {
        const result = evalPair(la, lb);
        expect(result.difference).toBe(expectedDiff);
        expect(result.classification).toBe(expectedClass);
      },
    );

    it('result is order-insensitive: (a,b) and (b,a) produce the same difference', () => {
      const ab = svc.evaluate(new Map([['TRL', 7], ['CRL', 2]]), [pair(1, 'TRL', 'CRL')])[0];
      const ba = svc.evaluate(new Map([['CRL', 2], ['TRL', 7]]), [pair(1, 'TRL', 'CRL')])[0];
      expect(ab.difference).toBe(ba.difference);
      expect(ab.classification).toBe(ba.classification);
    });
  });

  // ── PayFlow case (KTH guide p.22) ─────────────────────────────────────────

  describe('PayFlow case (KTH guide p.22): TRL 5, CRL 3, BRL 3, IPRL 2, TmRL 4, FRL 3', () => {
    const results = svc.evaluate(PAYFLOW_LEVELS, KTH_PAIRS);

    it('produces exactly 6 results — one per KTH pair', () => {
      expect(results).toHaveLength(6);
    });

    it('preserves pair id, left, and right codes on each result', () => {
      for (let i = 0; i < KTH_PAIRS.length; i++) {
        expect(results[i].pairId).toBe(KTH_PAIRS[i].id);
        expect(results[i].left.value).toBe(KTH_PAIRS[i].left.value);
        expect(results[i].right.value).toBe(KTH_PAIRS[i].right.value);
      }
    });

    it.each([
      // [pairIndex, expectedDiff, expectedClass]
      [0, 2, 'MODERADO'],   // TRL(5) - CRL(3) = 2
      [1, 2, 'MODERADO'],   // TRL(5) - BRL(3) = 2
      [2, 0, 'ACEPTABLE'],  // CRL(3) - BRL(3) = 0
      [3, 1, 'ACEPTABLE'],  // TmRL(4) - FRL(3) = 1
      [4, 1, 'ACEPTABLE'],  // BRL(3) - IPRL(2) = 1
      [5, 3, 'MODERADO'],   // TRL(5) - IPRL(2) = 3
    ])(
      'pair[%i]: difference=%i, classification=%s',
      (idx, diff, cls) => {
        expect(results[idx].difference).toBe(diff);
        expect(results[idx].classification).toBe(cls);
      },
    );
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns empty array when no pairs are supplied', () => {
      expect(svc.evaluate(PAYFLOW_LEVELS, [])).toEqual([]);
    });

    it('uses 0 when a dimension code is missing from the level map (missing = 0)', () => {
      const result = svc.evaluate(
        new Map([['TRL', 5]]),
        [pair(1, 'TRL', 'CRL')],
      )[0];
      expect(result.difference).toBe(5);
      expect(result.classification).toBe('CRITICO');
    });

    it('classifies as ACEPTABLE when both codes are missing', () => {
      const result = svc.evaluate(new Map(), [pair(1, 'TRL', 'CRL')])[0];
      expect(result.difference).toBe(0);
      expect(result.classification).toBe('ACEPTABLE');
    });

    it('critical threshold is strictly > 3 (not ≥ 3)', () => {
      const at3 = svc.evaluate(new Map([['TRL', 6], ['CRL', 3]]), [pair(1, 'TRL', 'CRL')])[0];
      const at4 = svc.evaluate(new Map([['TRL', 7], ['CRL', 3]]), [pair(1, 'TRL', 'CRL')])[0];
      expect(at3.classification).toBe('MODERADO');
      expect(at4.classification).toBe('CRITICO');
    });

    it('all levels equal → all pairs ACEPTABLE with difference 0', () => {
      const uniform = new Map<string, number>([
        ['TRL', 5], ['CRL', 5], ['BRL', 5], ['IPRL', 5], ['TmRL', 5], ['FRL', 5],
      ]);
      const results = svc.evaluate(uniform, KTH_PAIRS);
      for (const r of results) {
        expect(r.difference).toBe(0);
        expect(r.classification).toBe('ACEPTABLE');
      }
    });

    it('extreme levels (1 vs 9) → all possible pairs CRITICO', () => {
      const extreme = new Map<string, number>([
        ['TRL', 9], ['CRL', 1], ['BRL', 9], ['IPRL', 1], ['TmRL', 9], ['FRL', 1],
      ]);
      const results = svc.evaluate(extreme, KTH_PAIRS);
      const criticalCount = results.filter((r) => r.classification === 'CRITICO').length;
      expect(criticalCount).toBeGreaterThan(0);
    });
  });
});
