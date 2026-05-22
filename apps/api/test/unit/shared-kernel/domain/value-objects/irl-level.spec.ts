import { IrlLevel } from '../../../../../src/shared-kernel/domain/value-objects/irl-level.vo.js';
import { InvariantViolationError } from '../../../../../src/shared-kernel/domain/errors/invariant-violation.error.js';

describe('IrlLevel', () => {
  describe('create', () => {
    it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])('accepts valid level %s', (level) => {
      expect(IrlLevel.create(level).value).toBe(level);
    });

    it.each([0, 10, -1, 1.5])('throws for invalid level %s', (level) => {
      expect(() => IrlLevel.create(level)).toThrow(InvariantViolationError);
    });
  });

  describe('equals', () => {
    it('returns true for same level', () => {
      expect(IrlLevel.create(5).equals(IrlLevel.create(5))).toBe(true);
    });

    it('returns false for different levels', () => {
      expect(IrlLevel.create(3).equals(IrlLevel.create(7))).toBe(false);
    });
  });

  describe('diff', () => {
    it('returns absolute difference', () => {
      expect(IrlLevel.create(7).diff(IrlLevel.create(3))).toBe(4);
      expect(IrlLevel.create(3).diff(IrlLevel.create(7))).toBe(4);
    });

    it('returns 0 for same level', () => {
      expect(IrlLevel.create(5).diff(IrlLevel.create(5))).toBe(0);
    });
  });
});
