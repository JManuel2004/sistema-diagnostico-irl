import { InvariantViolationError } from '../../../../../src/shared-kernel/domain/errors/invariant-violation.error.js';
import { NotFoundError } from '../../../../../src/shared-kernel/domain/errors/not-found.error.js';
import { ForbiddenError } from '../../../../../src/shared-kernel/domain/errors/forbidden.error.js';
import { ConflictError } from '../../../../../src/shared-kernel/domain/errors/conflict.error.js';

describe('Domain errors', () => {
  describe('InvariantViolationError', () => {
    it('has code INVARIANT_VIOLATION', () => {
      const err = new InvariantViolationError('bad input');
      expect(err.code).toBe('INVARIANT_VIOLATION');
    });

    it('is an instance of Error', () => {
      expect(new InvariantViolationError('msg')).toBeInstanceOf(Error);
    });

    it('carries optional details', () => {
      const err = new InvariantViolationError('bad', { received: 'x' });
      expect(err.details?.received).toBe('x');
    });
  });

  describe('NotFoundError', () => {
    it('has code NOT_FOUND', () => {
      expect(new NotFoundError('Diagnostic').code).toBe('NOT_FOUND');
    });

    it('formats message with identifier', () => {
      const err = new NotFoundError('Diagnostic', 'abc-123');
      expect(err.message).toContain('abc-123');
    });

    it('formats message without identifier', () => {
      const err = new NotFoundError('Diagnostic');
      expect(err.message).toContain('Diagnostic');
    });
  });

  describe('ForbiddenError', () => {
    it('has code FORBIDDEN', () => {
      expect(new ForbiddenError('not yours').code).toBe('FORBIDDEN');
    });
  });

  describe('ConflictError', () => {
    it('has code CONFLICT', () => {
      expect(new ConflictError('duplicate').code).toBe('CONFLICT');
    });

    it('carries optional details', () => {
      const err = new ConflictError('dup', { key: 'id' });
      expect(err.details?.key).toBe('id');
    });
  });
});
