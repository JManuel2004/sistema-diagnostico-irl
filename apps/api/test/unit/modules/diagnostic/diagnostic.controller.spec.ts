import { jest } from '@jest/globals';
import { DiagnosticController } from '../../../../src/modules/diagnostic/interfaces/http/diagnostic.controller.js';
import { FinalizeInitialDiagnosticUseCase } from '../../../../src/modules/diagnostic/application/finalize-initial-diagnostic.use-case.js';
import type { MaturityProfileResponse } from '@innlab/contracts';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('DiagnosticController', () => {
  let controller: DiagnosticController;
  let mockUseCase: jest.Mocked<Pick<FinalizeInitialDiagnosticUseCase, 'execute'>>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() };
    controller = new DiagnosticController(
      mockUseCase as unknown as FinalizeInitialDiagnosticUseCase,
    );
  });

  it('delegates finalizar-inicial to the orchestrator use case', async () => {
    const profile = { diagnosticId: DIAGNOSTIC_ID } as MaturityProfileResponse;
    mockUseCase.execute.mockResolvedValueOnce(profile as never);
    const answers = [{ statementId: '1', value: 3 }];

    const result = await controller.finalize(DIAGNOSTIC_ID, { answers });

    expect(mockUseCase.execute).toHaveBeenCalledWith({
      diagnosticId: DIAGNOSTIC_ID,
      answers,
    });
    expect(result).toBe(profile);
  });
});
