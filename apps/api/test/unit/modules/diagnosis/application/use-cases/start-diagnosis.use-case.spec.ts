import { jest } from '@jest/globals';
import { diagnosticSchema } from '@innlab/contracts';
import { StartDiagnosisUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/start-diagnosis.use-case.js';
import type { DiagnosisRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/diagnosis.repository.port.js';
import { frameworkTaxonomy } from '../../support/framework-taxonomy.js';

/** An id no new diagnostic can take. */
const EXISTING_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('StartDiagnosisUseCase', () => {
  let save: jest.Mock<DiagnosisRepositoryPort['save']>;
  let deleteIncompleteByUserId: jest.Mock<
    DiagnosisRepositoryPort['deleteIncompleteByUserId']
  >;
  let useCase: StartDiagnosisUseCase;

  beforeEach(() => {
    save = jest
      .fn<DiagnosisRepositoryPort['save']>()
      .mockResolvedValue(undefined);
    deleteIncompleteByUserId = jest
      .fn<DiagnosisRepositoryPort['deleteIncompleteByUserId']>()
      .mockResolvedValue(0);
    useCase = new StartDiagnosisUseCase(
      { save, deleteIncompleteByUserId } as unknown as DiagnosisRepositoryPort,
      frameworkTaxonomy(),
    );
  });

  it('creates one owned by the caller, at the start of the flow', async () => {
    const result = await useCase.execute({ userId: 'user-1' });

    expect(() => diagnosticSchema.parse(result)).not.toThrow();
    expect(result.userId).toBe('user-1');
    // Consent and initiative come next; neither is skipped.
    expect(result.state).toBe('STARTED');
    expect(result.completed).toBe(false);
    expect(result.deepAnalysisAccepted).toBe(false);
    // Answered with the current framework version.
    expect(result.frameworkVersion).toBe('KTH-IRL-1.0');
  });

  it('saves the diagnostic it returns', async () => {
    const result = await useCase.execute({ userId: 'user-1' });

    expect(save).toHaveBeenCalledTimes(1);
    const saved = save.mock.calls[0][0];
    expect(saved.id.value).toBe(result.id);
    expect(saved.state.value).toBe('STARTED');
  });

  // DIAGIRL-26: an unfinished diagnostic of an earlier session is not resumed.
  it("deletes the caller's unfinished diagnostics before creating the new one", async () => {
    deleteIncompleteByUserId.mockResolvedValueOnce(1);

    const result = await useCase.execute({ userId: 'user-1' });

    expect(deleteIncompleteByUserId).toHaveBeenCalledWith('user-1');
    expect(deleteIncompleteByUserId.mock.invocationCallOrder[0]).toBeLessThan(
      save.mock.invocationCallOrder[0],
    );
    expect(result.id).not.toBe(EXISTING_ID);
    expect(result.state).toBe('STARTED');
  });

  it('creates a new diagnostic on every call: starting is always from the beginning', async () => {
    const a = await useCase.execute({ userId: 'user-1' });
    const b = await useCase.execute({ userId: 'user-1' });

    expect(a.id).not.toBe(b.id);
    expect(save).toHaveBeenCalledTimes(2);
  });
});
