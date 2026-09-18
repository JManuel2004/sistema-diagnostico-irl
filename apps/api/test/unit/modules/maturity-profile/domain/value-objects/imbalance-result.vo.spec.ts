import { ImbalanceResult } from '../../../../../../src/modules/maturity-profile/domain/value-objects/imbalance-result.vo.js';
import { DimensionCode } from '../../../../../../src/shared/kernel/domain/value-objects/dimension-code.js';

function makeResult(
  pairId = 1,
  left = 'TRL',
  right = 'CRL',
  difference = 2,
  classification: 'CRITICAL' | 'MODERATE' | 'ACCEPTABLE' = 'MODERATE',
) {
  return new ImbalanceResult(
    pairId,
    DimensionCode.create(left),
    DimensionCode.create(right),
    difference,
    classification,
  );
}

describe('ImbalanceResult (value object)', () => {
  describe('constructor', () => {
    it('stores all fields as given', () => {
      const r = makeResult(3, 'TmRL', 'FRL', 5, 'CRITICAL');
      expect(r.pairId).toBe(3);
      expect(r.left.value).toBe('TmRL');
      expect(r.right.value).toBe('FRL');
      expect(r.difference).toBe(5);
      expect(r.classification).toBe('CRITICAL');
    });

    it('accepts difference = 0 (identical levels)', () => {
      const r = makeResult(1, 'TRL', 'CRL', 0, 'ACCEPTABLE');
      expect(r.difference).toBe(0);
    });

    it('accepts difference = 8 (max spread IRL 1 vs IRL 9)', () => {
      const r = makeResult(1, 'TRL', 'CRL', 8, 'CRITICAL');
      expect(r.difference).toBe(8);
    });
  });

  describe('toPersistence()', () => {
    it('returns a plain object with the correct shape', () => {
      const r = makeResult(2, 'BRL', 'IPRL', 3, 'MODERATE');
      const p = r.toPersistence();
      expect(p).toEqual({
        pairId: 2,
        leftCode: 'BRL',
        rightCode: 'IPRL',
        difference: 3,
        classification: 'MODERATE',
      });
    });

    it.each([
      ['CRITICAL' as const],
      ['MODERATE' as const],
      ['ACCEPTABLE' as const],
    ])('round-trips classification %s', (cls) => {
      const r = makeResult(1, 'TRL', 'CRL', 1, cls);
      expect(r.toPersistence().classification).toBe(cls);
    });

    it('returns a new plain object each time (not a reference)', () => {
      const r = makeResult();
      expect(r.toPersistence()).not.toBe(r.toPersistence());
    });
  });

  describe('fromPersistence()', () => {
    it('restores the value object from a snapshot', () => {
      const r = ImbalanceResult.fromPersistence({
        pairId: 4,
        leftCode: 'TRL',
        rightCode: 'IPRL',
        difference: 3,
        classification: 'MODERATE',
      });
      expect(r.pairId).toBe(4);
      expect(r.left.value).toBe('TRL');
      expect(r.right.value).toBe('IPRL');
      expect(r.difference).toBe(3);
      expect(r.classification).toBe('MODERATE');
    });
  });
});
