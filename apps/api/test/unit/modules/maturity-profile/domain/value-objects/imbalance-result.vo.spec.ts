import { ImbalanceResult } from '../../../../../../src/modules/maturity-profile/domain/value-objects/imbalance-result.vo.js';
import { DimensionCode } from '../../../../../../src/shared-kernel/domain/value-objects/dimension-code.js';

function makeResult(
  pairId = 1,
  left = 'TRL',
  right = 'CRL',
  difference = 2,
  classification: 'CRITICO' | 'MODERADO' | 'ACEPTABLE' = 'MODERADO',
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
      const r = makeResult(3, 'TmRL', 'FRL', 5, 'CRITICO');
      expect(r.pairId).toBe(3);
      expect(r.left.value).toBe('TmRL');
      expect(r.right.value).toBe('FRL');
      expect(r.difference).toBe(5);
      expect(r.classification).toBe('CRITICO');
    });

    it('accepts difference = 0 (identical levels)', () => {
      const r = makeResult(1, 'TRL', 'CRL', 0, 'ACEPTABLE');
      expect(r.difference).toBe(0);
    });

    it('accepts difference = 8 (max spread IRL 1 vs IRL 9)', () => {
      const r = makeResult(1, 'TRL', 'CRL', 8, 'CRITICO');
      expect(r.difference).toBe(8);
    });
  });

  describe('toPersistence()', () => {
    it('returns a plain object with the correct shape', () => {
      const r = makeResult(2, 'BRL', 'IPRL', 3, 'MODERADO');
      const p = r.toPersistence();
      expect(p).toEqual({
        pairId: 2,
        leftCode: 'BRL',
        rightCode: 'IPRL',
        difference: 3,
        classification: 'MODERADO',
      });
    });

    it.each([
      ['CRITICO' as const],
      ['MODERADO' as const],
      ['ACEPTABLE' as const],
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
        classification: 'MODERADO',
      });
      expect(r.pairId).toBe(4);
      expect(r.left.value).toBe('TRL');
      expect(r.right.value).toBe('IPRL');
      expect(r.difference).toBe(3);
      expect(r.classification).toBe('MODERADO');
    });
  });
});
