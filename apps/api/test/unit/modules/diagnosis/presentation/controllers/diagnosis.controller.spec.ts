import { jest } from '@jest/globals';
import { DiagnosisController } from '../../../../../../src/modules/diagnosis/presentation/controllers/diagnosis.controller.js';
import type { FinalizeInitialDiagnosisUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/finalize-initial-diagnosis.use-case.js';
import type { MaturityProfileResponse } from '@innlab/contracts';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('DiagnosisController', () => {
  let controller: DiagnosisController;
  let mockUseCase: jest.Mocked<Pick<FinalizeInitialDiagnosisUseCase, 'execute'>>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() };
    controller = new DiagnosisController(
      mockUseCase as unknown as FinalizeInitialDiagnosisUseCase,
    );
  });

  it('delegates finalizar-inicial to the orchestrator use case', async () => {
    const profile = { diagnosticId: DIAGNOSTIC_ID } as MaturityProfileResponse;
    mockUseCase.execute.mockResolvedValueOnce(profile);
    const answers = [{ statementId: '1', value: 3 }];

    const result = await controller.finalize(DIAGNOSTIC_ID, { answers });

    expect(mockUseCase.execute).toHaveBeenCalledWith({
      diagnosticId: DIAGNOSTIC_ID,
      answers,
    });
    expect(result).toBe(profile);
  });
});
