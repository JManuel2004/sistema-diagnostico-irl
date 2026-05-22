import { AnswerSheet } from '../../../../../src/modules/questionnaire/domain/entities/answer-sheet.aggregate.js';
import { LikertValue } from '../../../../../src/shared-kernel/domain/value-objects/likert-value.vo.js';
import { Uuid } from '../../../../../src/shared-kernel/domain/value-objects/uuid.vo.js';

const DIAGNOSTIC_ID = Uuid.create('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

describe('AnswerSheet', () => {
  describe('create', () => {
    it('creates an empty sheet', () => {
      const sheet = AnswerSheet.create(DIAGNOSTIC_ID);
      expect(sheet.answeredCount).toBe(0);
      expect(sheet.answers()).toHaveLength(0);
    });
  });

  describe('fromPersistence', () => {
    it('reconstructs sheet from rows', () => {
      const sheet = AnswerSheet.fromPersistence(DIAGNOSTIC_ID, [
        { statementId: '1', value: 3 },
        { statementId: '2', value: 5 },
      ]);
      expect(sheet.answeredCount).toBe(2);
      expect(sheet.getAnswer('1')?.value.value).toBe(3);
      expect(sheet.getAnswer('2')?.value.value).toBe(5);
    });
  });

  describe('setAnswer', () => {
    it('adds a new answer', () => {
      const sheet = AnswerSheet.create(DIAGNOSTIC_ID);
      sheet.setAnswer('1', LikertValue.create(4));
      expect(sheet.answeredCount).toBe(1);
      expect(sheet.getAnswer('1')?.value.value).toBe(4);
    });

    it('upserts an existing answer', () => {
      const sheet = AnswerSheet.create(DIAGNOSTIC_ID);
      sheet.setAnswer('1', LikertValue.create(3));
      sheet.setAnswer('1', LikertValue.create(5));
      expect(sheet.answeredCount).toBe(1);
      expect(sheet.getAnswer('1')?.value.value).toBe(5);
    });

    it('accumulates distinct answers', () => {
      const sheet = AnswerSheet.create(DIAGNOSTIC_ID);
      for (let i = 1; i <= 48; i++) {
        sheet.setAnswer(String(i), LikertValue.create(3));
      }
      expect(sheet.answeredCount).toBe(48);
    });
  });

  describe('toPersistence', () => {
    it('serialises all answers', () => {
      const sheet = AnswerSheet.create(DIAGNOSTIC_ID);
      sheet.setAnswer('10', LikertValue.create(2));
      sheet.setAnswer('20', LikertValue.create(4));
      const rows = sheet.toPersistence();
      expect(rows).toHaveLength(2);
      expect(rows.find((r) => r.statementId === '10')?.value).toBe(2);
      expect(rows.find((r) => r.statementId === '20')?.value).toBe(4);
    });
  });
});
