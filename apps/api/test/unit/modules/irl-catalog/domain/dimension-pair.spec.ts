import { DimensionPair } from '../../../../../src/modules/irl-catalog/domain/dimension-pair.js';
import { InvariantViolationError } from '../../../../../src/shared-kernel/domain/errors/invariant-violation.error.js';

describe('DimensionPair', () => {
  describe('fromPersistence', () => {
    it('creates a valid pair', () => {
      const pair = DimensionPair.fromPersistence({ id: 1, leftCode: 'TRL', rightCode: 'CRL' });
      expect(pair.id).toBe(1);
      expect(pair.left.value).toBe('TRL');
      expect(pair.right.value).toBe('CRL');
    });

    it('throws when left and right codes are the same', () => {
      expect(() =>
        DimensionPair.fromPersistence({ id: 1, leftCode: 'TRL', rightCode: 'TRL' }),
      ).toThrow(InvariantViolationError);
    });

    it('throws for invalid dimension code', () => {
      expect(() =>
        DimensionPair.fromPersistence({ id: 1, leftCode: 'TRL', rightCode: 'XYZ' }),
      ).toThrow(InvariantViolationError);
    });
  });

  describe('equals', () => {
    it('returns true for same-order pair', () => {
      const a = DimensionPair.fromPersistence({ id: 1, leftCode: 'TRL', rightCode: 'CRL' });
      const b = DimensionPair.fromPersistence({ id: 2, leftCode: 'TRL', rightCode: 'CRL' });
      expect(a.equals(b)).toBe(true);
    });

    it('returns true for reversed pair (order-insensitive)', () => {
      const a = DimensionPair.fromPersistence({ id: 1, leftCode: 'TRL', rightCode: 'CRL' });
      const b = DimensionPair.fromPersistence({ id: 2, leftCode: 'CRL', rightCode: 'TRL' });
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different pair', () => {
      const a = DimensionPair.fromPersistence({ id: 1, leftCode: 'TRL', rightCode: 'CRL' });
      const b = DimensionPair.fromPersistence({ id: 2, leftCode: 'TRL', rightCode: 'BRL' });
      expect(a.equals(b)).toBe(false);
    });
  });
});
