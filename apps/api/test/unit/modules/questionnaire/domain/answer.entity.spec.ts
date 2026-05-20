import { Answer } from '../../../../../src/modules/questionnaire/domain/entities/answer.entity.js';
import { LikertValue } from '../../../../../src/shared-kernel/domain/value-objects/likert-value.vo.js';

describe('Answer', () => {
  describe('create', () => {
    it('stores the given statementId and value', () => {
      const value = LikertValue.create(3);
      const answer = Answer.create('stmt-1', value);
      expect(answer.statementId).toBe('stmt-1');
      expect(answer.value).toBe(value);
    });
  });

  describe('fromPersistence', () => {
    it('reconstructs an answer from a persistence row', () => {
      const answer = Answer.fromPersistence({ statementId: '42', value: 4 });
      expect(answer.statementId).toBe('42');
      expect(answer.value.value).toBe(4);
    });
  });

  describe('withValue', () => {
    it('returns a new Answer with the updated Likert value, preserving statementId', () => {
      const original = Answer.create('stmt-1', LikertValue.create(2));
      const updated = original.withValue(LikertValue.create(5));
      expect(updated.statementId).toBe('stmt-1');
      expect(updated.value.value).toBe(5);
    });

    it('does not mutate the original answer', () => {
      const original = Answer.create('stmt-1', LikertValue.create(2));
      original.withValue(LikertValue.create(5));
      expect(original.value.value).toBe(2);
    });
  });

  describe('equals', () => {
    it('returns true when both answers share the same statementId regardless of value', () => {
      const a = Answer.create('stmt-1', LikertValue.create(3));
      const b = Answer.create('stmt-1', LikertValue.create(5));
      expect(a.equals(b)).toBe(true);
    });

    it('returns false when the statementIds differ', () => {
      const a = Answer.create('stmt-1', LikertValue.create(3));
      const b = Answer.create('stmt-2', LikertValue.create(3));
      expect(a.equals(b)).toBe(false);
    });
  });
});
