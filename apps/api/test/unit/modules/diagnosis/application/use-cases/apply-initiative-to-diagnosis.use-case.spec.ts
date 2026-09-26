import { jest } from '@jest/globals';
import { ApplyInitiativeToDiagnosisUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/apply-initiative-to-diagnosis.use-case.js';
import type { DiagnosisRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/diagnosis.repository.port.js';
import { Diagnosis } from '../../../../../../src/modules/diagnosis/domain/entities/diagnosis.aggregate.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';

const ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function diagnosisIn(state: string): Diagnosis {
  return Diagnosis.fromPersistence({
    id: ID,
    userId: 'user-1',
    state,
    createdAt: new Date(),
    frameworkVersionId: 1,
  });
}

describe('ApplyInitiativeToDiagnosisUseCase', () => {
  let findById: jest.Mock<DiagnosisRepositoryPort['findById']>;
  let save: jest.Mock<DiagnosisRepositoryPort['save']>;
  let useCase: ApplyInitiativeToDiagnosisUseCase;

  beforeEach(() => {
    findById = jest.fn();
    save = jest.fn<DiagnosisRepositoryPort['save']>().mockResolvedValue(undefined);
    useCase = new ApplyInitiativeToDiagnosisUseCase({
      findById,
      save,
    } as unknown as DiagnosisRepositoryPort);
  });

  it('moves a diagnostic from WITH_CONSENT to WITH_INITIATIVE and saves it', async () => {
    findById.mockResolvedValueOnce(diagnosisIn('WITH_CONSENT'));

    const result = await useCase.execute({ diagnosticId: ID });

    expect(result.ok).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].state.value).toBe('WITH_INITIATIVE');
  });

  // The consent belongs to the initiative and may predate the diagnostic: a
  // profile registered on a STARTED diagnostic takes it through WITH_CONSENT.
  it('moves a STARTED diagnostic through WITH_CONSENT to WITH_INITIATIVE', async () => {
    findById.mockResolvedValueOnce(diagnosisIn('STARTED'));

    const result = await useCase.execute({ diagnosticId: ID });

    expect(result.ok).toBe(true);
    expect(save.mock.calls[0][0].state.value).toBe('WITH_INITIATIVE');
  });

  // Editing the initiative later must not pull a diagnostic that is further
  // along back, or fail because the transition is not legal.
  it.each([
    'WITH_INITIATIVE',
    'QUESTIONNAIRE_IN_PROGRESS',
    'PROFILE_GENERATED',
    'DEEP_ANALYSIS_COMPLETE',
  ])('leaves a diagnostic in %s untouched', async (state) => {
    findById.mockResolvedValueOnce(diagnosisIn(state));

    const result = await useCase.execute({ diagnosticId: ID });

    expect(result.ok).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });

  it('returns not found for an unknown diagnostic', async () => {
    findById.mockResolvedValueOnce(null);

    const result = await useCase.execute({ diagnosticId: ID });

    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(NotFoundError);
    expect(save).not.toHaveBeenCalled();
  });
});
