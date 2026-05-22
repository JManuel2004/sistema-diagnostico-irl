import { jest } from '@jest/globals';
import { QuestionnaireController } from '../../../../src/modules/questionnaire/interfaces/http/questionnaire.controller.js';
import { SubmitQuestionnaireUseCase } from '../../../../src/modules/questionnaire/application/submit-questionnaire.use-case.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('QuestionnaireController', () => {
  let controller: QuestionnaireController;
  let mockUseCase: jest.Mocked<Pick<SubmitQuestionnaireUseCase, 'execute'>>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() };
    controller = new QuestionnaireController(mockUseCase as unknown as SubmitQuestionnaireUseCase);
  });

  describe('submitQuestionnaire', () => {
    it('delegates to use case and returns its result', async () => {
      const expected = {
        diagnosticId: DIAGNOSTIC_ID,
        answersRecorded: 48,
        state: 'CUESTIONARIO_COMPLETO',
      };
      mockUseCase.execute.mockResolvedValueOnce(expected as never);

      const body = { answers: [{ statementId: '1', value: 3 }] };
      const result = await controller.submitQuestionnaire(DIAGNOSTIC_ID, body);

      expect(mockUseCase.execute).toHaveBeenCalledWith({
        diagnosticId: DIAGNOSTIC_ID,
        answers: body.answers,
      });
      expect(result).toBe(expected);
    });

    it('propagates use case errors', async () => {
      mockUseCase.execute.mockRejectedValueOnce(new Error('domain error') as never);
      await expect(
        controller.submitQuestionnaire(DIAGNOSTIC_ID, { answers: [] }),
      ).rejects.toThrow('domain error');
    });
  });
});
