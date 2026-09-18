import { unwrapResult } from '../../../../../src/shared/kernel/application/unwrap-result.js';
import { Result } from '../../../../../src/shared/kernel/domain/result.js';
import { NotFoundError } from '../../../../../src/shared/kernel/domain/errors/not-found.error.js';

describe('unwrapResult', () => {
  it('returns the value of an ok Result', () => {
    expect(unwrapResult(Result.ok(42))).toBe(42);
  });

  it('throws the wrapped error of a failed Result', () => {
    const error = new NotFoundError('Thing', '1');
    expect(() => unwrapResult(Result.err(error))).toThrow(error);
  });
});
