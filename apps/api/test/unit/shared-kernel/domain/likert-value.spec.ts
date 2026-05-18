import { LikertValue } from '../../../../src/shared-kernel/domain/value-objects/likert-value.vo.js';
import { InvariantViolationError } from '../../../../src/shared-kernel/domain/errors/invariant-violation.error.js';

describe('LikertValue (shared-kernel)', () => {
  describe('valid range 1..5', () => {
    it.each([1, 2, 3, 4, 5])('accepts %i', (v) => {
      const lv = LikertValue.create(v);
      expect(lv.value).toBe(v);
    });
  });

  describe('out-of-range values', () => {
    it.each([0, 6, -1, 100])('rejects %i', (v) => {
      expect(() => LikertValue.create(v)).toThrow(InvariantViolationError);
    });
  });

  describe('non-integer values', () => {
    it.each([1.5, 2.9, Number.NaN, Number.POSITIVE_INFINITY])(
      'rejects non-integer %s',
      (v) => {
        expect(() => LikertValue.create(v)).toThrow(InvariantViolationError);
      },
    );
  });

  describe('equality', () => {
    it('two LikertValues with same value are equal', () => {
      expect(LikertValue.create(3).equals(LikertValue.create(3))).toBe(true);
    });

    it('two LikertValues with different values are not equal', () => {
      expect(LikertValue.create(2).equals(LikertValue.create(5))).toBe(false);
    });
  });
});
