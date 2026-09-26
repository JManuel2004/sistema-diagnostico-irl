import { jest } from '@jest/globals';
import { RecordDeepAnalysisResultUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/record-deep-analysis-result.use-case.js';
import type { DiagnosisRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/diagnosis.repository.port.js';
import { Diagnosis } from '../../../../../../src/modules/diagnosis/domain/entities/diagnosis.aggregate.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';

const ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('RecordDeepAnalysisResultUseCase', () => {
  it('applies the result inside `modify`, which completes the diagnostic with both', async () => {
    const stored = Diagnosis.fromPersistence({
      id: ID,
      userId: 'user-1',
      state: 'DEEP_ANALYSIS_IN_PROGRESS',
      createdAt: new Date(),
      frameworkVersionId: 1,
      roadmapCalculatedAt: new Date(),
    });
    const modify = jest.fn<DiagnosisRepositoryPort['modify']>((_id, change) => {
      change(stored);
      return Promise.resolve(stored);
    });
    const useCase = new RecordDeepAnalysisResultUseCase({ modify } as unknown as DiagnosisRepositoryPort);

    const result = await useCase.execute({ diagnosticId: ID, result: 'recommendation' });

    expect(result.ok).toBe(true);
    expect(modify).toHaveBeenCalledWith(ID, expect.any(Function));
    expect(stored.state.value).toBe('DEEP_ANALYSIS_COMPLETE');
  });

  it('answers NotFoundError for a missing diagnostic', async () => {
    const modify = jest.fn<DiagnosisRepositoryPort['modify']>(() => Promise.resolve(null));
    const useCase = new RecordDeepAnalysisResultUseCase({ modify } as unknown as DiagnosisRepositoryPort);

    const result = await useCase.execute({ diagnosticId: ID, result: 'roadmap' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
