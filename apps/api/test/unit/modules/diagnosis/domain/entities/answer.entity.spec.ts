import { Answer } from '../../../../../../src/modules/diagnosis/domain/entities/answer.entity.js';
import { LikertValue } from '../../../../../../src/shared/kernel/domain/value-objects/likert-value.vo.js';
import { InvariantViolationError } from '../../../../../../src/shared/kernel/domain/errors/invariant-violation.error.js';

const WHY = 'Porque el piloto lo confirmó.';

describe('Answer', () => {
  describe('create', () => {
    it('stores the statementId, the value and the justification', () => {
      const value = LikertValue.create(3);
      const answer = Answer.create('stmt-1', value, WHY);
      expect(answer.statementId).toBe('stmt-1');
      expect(answer.value).toBe(value);
      expect(answer.justification).toBe(WHY);
    });

    it('trims the justification', () => {
      expect(Answer.create('s', LikertValue.create(3), `  ${WHY}  `).justification).toBe(WHY);
    });

    // The justification is mandatory.
    it.each(['', '   ', '\n\t'])('rejects a blank justification (%j)', (blank) => {
      expect(() => Answer.create('s', LikertValue.create(3), blank)).toThrow(
        InvariantViolationError,
      );
    });

    it('rejects a justification above 1000 characters, accepts exactly 1000', () => {
      expect(() => Answer.create('s', LikertValue.create(3), 'x'.repeat(1001))).toThrow(
        InvariantViolationError,
      );
      expect(Answer.create('s', LikertValue.create(3), 'x'.repeat(1000)).justification).toHaveLength(
        1000,
      );
    });

    it('rejects a missing justification (undefined from an incomplete request body)', () => {
      expect(() =>
        Answer.create('s', LikertValue.create(3), undefined as unknown as string),
      ).toThrow(InvariantViolationError);
    });
  });

  describe('fromPersistence', () => {
    it('reconstructs an answer from a persistence row', () => {
      const answer = Answer.fromPersistence({ statementId: '42', value: 4, justification: WHY });
      expect(answer.statementId).toBe('42');
      expect(answer.value.value).toBe(4);
      expect(answer.justification).toBe(WHY);
    });
  });

  describe('withResponse', () => {
    it('returns a new Answer with the new value and justification, preserving statementId', () => {
      const original = Answer.create('stmt-1', LikertValue.create(2), WHY);
      const updated = original.withResponse(LikertValue.create(5), 'Cambió la evidencia.');
      expect(updated.statementId).toBe('stmt-1');
      expect(updated.value.value).toBe(5);
      expect(updated.justification).toBe('Cambió la evidencia.');
    });

    it('does not mutate the original answer', () => {
      const original = Answer.create('stmt-1', LikertValue.create(2), WHY);
      original.withResponse(LikertValue.create(5), 'Otra.');
      expect(original.value.value).toBe(2);
      expect(original.justification).toBe(WHY);
    });

    it('also requires a justification', () => {
      const original = Answer.create('stmt-1', LikertValue.create(2), WHY);
      expect(() => original.withResponse(LikertValue.create(5), ' ')).toThrow(
        InvariantViolationError,
      );
    });
  });

  describe('equals', () => {
    it('returns true when both answers share the same statementId regardless of value', () => {
      const a = Answer.create('stmt-1', LikertValue.create(3), WHY);
      const b = Answer.create('stmt-1', LikertValue.create(5), 'Otra.');
      expect(a.equals(b)).toBe(true);
    });

    it('returns false when the statementIds differ', () => {
      const a = Answer.create('stmt-1', LikertValue.create(3), WHY);
      const b = Answer.create('stmt-2', LikertValue.create(3), WHY);
      expect(a.equals(b)).toBe(false);
    });
  });
});
