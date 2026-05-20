import { ConversionRange } from '../../../../../src/modules/irl-catalog/domain/conversion-range.js';
import { InvariantViolationError } from '../../../../../src/shared-kernel/domain/errors/invariant-violation.error.js';

describe('ConversionRange', () => {
  describe('fromPersistence', () => {
    it('creates a valid range', () => {
      const range = ConversionRange.fromPersistence({ avgMin: 1.0, avgMax: 1.39, irlLevel: 1 });
      expect(range.avgMin).toBe(1.0);
      expect(range.avgMax).toBe(1.39);
      expect(range.irlLevel.value).toBe(1);
    });

    it('throws when avgMin < 1', () => {
      expect(() =>
        ConversionRange.fromPersistence({ avgMin: 0.9, avgMax: 1.39, irlLevel: 1 }),
      ).toThrow(InvariantViolationError);
    });

    it('throws when avgMax > 5', () => {
      expect(() =>
        ConversionRange.fromPersistence({ avgMin: 4.4, avgMax: 5.1, irlLevel: 9 }),
      ).toThrow(InvariantViolationError);
    });

    it('throws when avgMin > avgMax', () => {
      expect(() =>
        ConversionRange.fromPersistence({ avgMin: 2.0, avgMax: 1.5, irlLevel: 3 }),
      ).toThrow(InvariantViolationError);
    });

    it('throws for invalid IRL level', () => {
      expect(() =>
        ConversionRange.fromPersistence({ avgMin: 1.0, avgMax: 1.39, irlLevel: 0 }),
      ).toThrow(InvariantViolationError);
    });
  });

  describe('contains', () => {
    it('returns true for value at lower bound', () => {
      const range = ConversionRange.fromPersistence({ avgMin: 1.4, avgMax: 1.79, irlLevel: 2 });
      expect(range.contains(1.4)).toBe(true);
    });

    it('returns true for value at upper bound', () => {
      const range = ConversionRange.fromPersistence({ avgMin: 1.4, avgMax: 1.79, irlLevel: 2 });
      expect(range.contains(1.79)).toBe(true);
    });

    it('returns true for value inside range', () => {
      const range = ConversionRange.fromPersistence({ avgMin: 1.4, avgMax: 1.79, irlLevel: 2 });
      expect(range.contains(1.6)).toBe(true);
    });

    it('returns false for value below range', () => {
      const range = ConversionRange.fromPersistence({ avgMin: 1.4, avgMax: 1.79, irlLevel: 2 });
      expect(range.contains(1.39)).toBe(false);
    });

    it('returns false for value above range', () => {
      const range = ConversionRange.fromPersistence({ avgMin: 1.4, avgMax: 1.79, irlLevel: 2 });
      expect(range.contains(1.8)).toBe(false);
    });
  });
});
