import { jest } from '@jest/globals';
import { QuestionnaireController } from '../../../../../../src/modules/diagnosis/presentation/controllers/questionnaire.controller.js';
import type { SubmitQuestionnaireUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/submit-questionnaire.use-case.js';
import { Result } from '../../../../../../src/shared/kernel/domain/result.js';
import { InvariantViolationError } from '../../../../../../src/shared/kernel/domain/errors/invariant-violation.error.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('QuestionnaireController', () => {
  let controller: QuestionnaireController;
  let mockUseCase: jest.Mocked<Pick<SubmitQuestionnaireUseCase, 'execute'>>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() };
    controller = new QuestionnaireController(
      mockUseCase as unknown as SubmitQuestionnaireUseCase,
    );
  });

  describe('submitQuestionnaire', () => {
    it('delegates to use case and returns its result', async () => {
      const expected = {
        diagnosticId: DIAGNOSTIC_ID,
        answersRecorded: 48,
        state: 'QUESTIONNAIRE_COMPLETE',
      };
      mockUseCase.execute.mockResolvedValueOnce(Result.ok(expected) as never);

      const body = {
        answers: [
          {
            statementId: '1',
            value: 3,
            justification: 'Justificación de prueba',
          },
        ],
      };
      const result = await controller.submitQuestionnaire(
        { id: DIAGNOSTIC_ID },
        body,
        { id: 'user-1' },
      );

      expect(mockUseCase.execute).toHaveBeenCalledWith({
        diagnosticId: DIAGNOSTIC_ID,
        userId: 'user-1',
        answers: body.answers,
      });
      expect(result).toBe(expected);
    });

    it('throws the wrapped error on an err result', async () => {
      const error = new InvariantViolationError('incomplete submission');
      mockUseCase.execute.mockResolvedValueOnce(Result.err(error));

      await expect(
        controller.submitQuestionnaire({ id: DIAGNOSTIC_ID }, { answers: [] }, { id: 'user-1' }),
      ).rejects.toThrow(error);
    });

    it('propagates use case errors', async () => {
      mockUseCase.execute.mockRejectedValueOnce(new Error('domain error'));
      await expect(
        controller.submitQuestionnaire({ id: DIAGNOSTIC_ID }, { answers: [] }, { id: 'user-1' }),
      ).rejects.toThrow('domain error');
    });
  });
});
