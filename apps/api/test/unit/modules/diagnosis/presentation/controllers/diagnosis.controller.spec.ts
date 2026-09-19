import { jest } from '@jest/globals';
import { DiagnosisController } from '../../../../../../src/modules/diagnosis/presentation/controllers/diagnosis.controller.js';
import type { FinalizeInitialDiagnosisUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/finalize-initial-diagnosis.use-case.js';
import type { RequestDeepAnalysisUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/request-deep-analysis.use-case.js';
import { Result } from '../../../../../../src/shared/kernel/domain/result.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';
import type { MaturityProfileResponse } from '@innlab/contracts';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('DiagnosisController', () => {
  let controller: DiagnosisController;
  let mockUseCase: jest.Mocked<Pick<FinalizeInitialDiagnosisUseCase, 'execute'>>;
  let mockDeepAnalysis: jest.Mocked<Pick<RequestDeepAnalysisUseCase, 'execute'>>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() };
    mockDeepAnalysis = { execute: jest.fn() };
    controller = new DiagnosisController(
      mockUseCase as unknown as FinalizeInitialDiagnosisUseCase,
      mockDeepAnalysis as unknown as RequestDeepAnalysisUseCase,
    );
  });

  it('delegates finalize-initial to the orchestrator use case', async () => {
    const profile = { diagnosticId: DIAGNOSTIC_ID } as MaturityProfileResponse;
    mockUseCase.execute.mockResolvedValueOnce(Result.ok(profile));
    const answers = [{ statementId: '1', value: 3 }];

    const result = await controller.finalize(DIAGNOSTIC_ID, { answers });

    expect(mockUseCase.execute).toHaveBeenCalledWith({
      diagnosticId: DIAGNOSTIC_ID,
      answers,
    });
    expect(result).toBe(profile);
  });

  it('throws the wrapped error on an err result', async () => {
    const error = new NotFoundError('Diagnosis', DIAGNOSTIC_ID);
    mockUseCase.execute.mockResolvedValueOnce(Result.err(error));

    await expect(
      controller.finalize(DIAGNOSTIC_ID, { answers: [] }),
    ).rejects.toThrow(error);
  });
  describe('requestDeepAnalysisFor', () => {
    it('delegates to the deep-analysis use case and returns its value', async () => {
      const expected = {
        diagnosticId: DIAGNOSTIC_ID,
        state: 'DEEP_ANALYSIS_IN_PROGRESS' as const,
      };
      mockDeepAnalysis.execute.mockResolvedValueOnce(Result.ok(expected));

      const result = await controller.requestDeepAnalysisFor(DIAGNOSTIC_ID);

      expect(mockDeepAnalysis.execute).toHaveBeenCalledWith({
        diagnosticId: DIAGNOSTIC_ID,
      });
      expect(result).toBe(expected);
    });

    it('throws the wrapped error on an err result', async () => {
      const error = new NotFoundError('Diagnosis', DIAGNOSTIC_ID);
      mockDeepAnalysis.execute.mockResolvedValueOnce(Result.err(error));

      await expect(
        controller.requestDeepAnalysisFor(DIAGNOSTIC_ID),
      ).rejects.toThrow(error);
    });
  });
});
