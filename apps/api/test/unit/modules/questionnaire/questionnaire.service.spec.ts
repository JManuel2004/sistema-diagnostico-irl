/* eslint-disable @typescript-eslint/unbound-method */
import { jest } from '@jest/globals';
import { SubmitQuestionnaireUseCase } from '../../../../src/modules/questionnaire/application/submit-questionnaire.use-case.js';
import type { AnswerSheetRepositoryPort } from '../../../../src/modules/questionnaire/domain/ports/answer-sheet.repository.port.js';
import { InvariantViolationError } from '../../../../src/shared-kernel/domain/errors/invariant-violation.error.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('SubmitQuestionnaireUseCase', () => {
  let useCase: SubmitQuestionnaireUseCase;
  let mockRepo: jest.Mocked<AnswerSheetRepositoryPort>;

  beforeEach(() => {
    mockRepo = {
      save: jest
        .fn<AnswerSheetRepositoryPort['save']>()
        .mockResolvedValue(undefined),
      findByDiagnosticId: jest
        .fn<AnswerSheetRepositoryPort['findByDiagnosticId']>()
        .mockResolvedValue(null),
    };
    useCase = new SubmitQuestionnaireUseCase(mockRepo);
  });

  it('saves the answer sheet and returns a response', async () => {
    const answers = Array.from({ length: 48 }, (_, i) => ({
      statementId: String(i + 1),
      value: 3,
    }));

    const result = await useCase.execute({
      diagnosticId: DIAGNOSTIC_ID,
      answers,
    });

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(result.diagnosticId).toBe(DIAGNOSTIC_ID);
    expect(result.answersRecorded).toBe(48);
    expect(result.state).toBe('CUESTIONARIO_COMPLETO');
  });

  it('throws for invalid diagnostic UUID', async () => {
    await expect(
      useCase.execute({ diagnosticId: 'not-a-uuid', answers: [] }),
    ).rejects.toThrow(InvariantViolationError);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('throws for invalid Likert value', async () => {
    await expect(
      useCase.execute({
        diagnosticId: DIAGNOSTIC_ID,
        answers: [{ statementId: '1', value: 6 }],
      }),
    ).rejects.toThrow(InvariantViolationError);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('upserts duplicate statementId (last write wins)', async () => {
    const answers = [
      { statementId: '1', value: 2 },
      { statementId: '1', value: 5 },
    ];

    const result = await useCase.execute({
      diagnosticId: DIAGNOSTIC_ID,
      answers,
    });

    expect(result.answersRecorded).toBe(1);
    const savedSheet = mockRepo.save.mock.calls[0][0];
    expect(savedSheet.getAnswer('1')?.value.value).toBe(5);
  });
});
