import { describe, expect, it } from '@jest/globals';
import { QuestionnaireDraft } from '../../../../../../src/modules/diagnosis/domain/entities/questionnaire-draft.aggregate.js';
import { InvariantViolationError } from '../../../../../../src/shared/kernel/domain/errors/invariant-violation.error.js';

const ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('QuestionnaireDraft', () => {
  it('keeps a level, a justification, or both, per statement', () => {
    const draft = QuestionnaireDraft.from(ID, [
      { statementId: '1', value: 4, justification: null },
      { statementId: '2', value: null, justification: 'Todavía lo pienso' },
      { statementId: '3', value: 2, justification: 'Hay un piloto' },
    ]);

    expect(draft.entries()).toEqual([
      { statementId: '1', value: 4, justification: null },
      { statementId: '2', value: null, justification: 'Todavía lo pienso' },
      { statementId: '3', value: 2, justification: 'Hay un piloto' },
    ]);
    expect(draft.answeredCount).toBe(2);
  });

  it('drops an entry with neither, and treats a blank justification as missing', () => {
    const draft = QuestionnaireDraft.from(ID, [
      { statementId: '1', value: null, justification: '   ' },
      { statementId: '2', value: 5, justification: '  con espacios  ' },
    ]);

    expect(draft.entries()).toEqual([
      { statementId: '2', value: 5, justification: 'con espacios' },
    ]);
  });

  it.each([0, 6, 2.5])(
    'rejects the level %s, outside the Likert scale',
    (value) => {
      expect(() =>
        QuestionnaireDraft.from(ID, [
          { statementId: '1', value, justification: null },
        ]),
      ).toThrow(InvariantViolationError);
    },
  );

  it('rejects a justification longer than an answer accepts', () => {
    expect(() =>
      QuestionnaireDraft.from(ID, [
        { statementId: '1', value: 3, justification: 'x'.repeat(1001) },
      ]),
    ).toThrow(InvariantViolationError);
  });

  it('rejects a statement that appears twice', () => {
    expect(() =>
      QuestionnaireDraft.from(ID, [
        { statementId: '1', value: 3, justification: null },
        { statementId: '1', value: 4, justification: null },
      ]),
    ).toThrow(InvariantViolationError);
  });

  it('an empty draft has nothing and was never saved', () => {
    const draft = QuestionnaireDraft.empty(ID);

    expect(draft.entries()).toEqual([]);
    expect(draft.updatedAt).toBeNull();
  });
});
