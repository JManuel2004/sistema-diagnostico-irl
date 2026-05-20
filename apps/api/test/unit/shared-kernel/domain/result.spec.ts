import { Result } from '../../../../src/shared-kernel/domain/result.js';
import { InvariantViolationError } from '../../../../src/shared-kernel/domain/errors/invariant-violation.error.js';

describe('Result', () => {
  describe('ok', () => {
    it('creates a success result', () => {
      const result = Result.ok(42);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    it('works with objects', () => {
      const result = Result.ok({ id: '1', name: 'test' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id).toBe('1');
      }
    });
  });

  describe('err', () => {
    it('creates a failure result', () => {
      const error = new InvariantViolationError('bad input');
      const result = Result.err(error);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(error);
        expect(result.error.code).toBe('INVARIANT_VIOLATION');
      }
    });
  });
});
