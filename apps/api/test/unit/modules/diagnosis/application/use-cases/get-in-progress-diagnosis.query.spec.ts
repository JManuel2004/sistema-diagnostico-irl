import { describe, expect, it, jest } from '@jest/globals';
import { GetInProgressDiagnosisQuery } from '../../../../../../src/modules/diagnosis/application/use-cases/get-in-progress-diagnosis.query.js';
import { Diagnosis } from '../../../../../../src/modules/diagnosis/domain/entities/diagnosis.aggregate.js';
import type { DiagnosisRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/diagnosis.repository.port.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';
import { frameworkTaxonomy } from '../../support/framework-taxonomy.js';

function diagnosis(id: string, state: string, createdAt: string): Diagnosis {
  return Diagnosis.fromPersistence({
    id,
    userId: 'user-1',
    state,
    frameworkVersionId: 1,
    createdAt: new Date(createdAt),
  });
}

const OLD = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const NEW = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
const DONE = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';

describe('GetInProgressDiagnosisQuery', () => {
  function query(list: Diagnosis[]): GetInProgressDiagnosisQuery {
    return new GetInProgressDiagnosisQuery(
      {
        findAllByUserId: jest.fn(() => Promise.resolve(list)),
      } as unknown as DiagnosisRepositoryPort,
      frameworkTaxonomy(),
    );
  }

  it('returns the most recently started diagnostic without a profile', async () => {
    const result = await query([
      diagnosis(DONE, 'PROFILE_GENERATED', '2026-10-15T00:00:00Z'),
      diagnosis(OLD, 'STARTED', '2026-10-01T00:00:00Z'),
      diagnosis(NEW, 'QUESTIONNAIRE_IN_PROGRESS', '2026-10-10T00:00:00Z'),
    ]).execute('user-1');

    if (!result.ok) throw new Error('expected ok result');
    expect(result.value.id).toBe(NEW);
    expect(result.value.completed).toBe(false);
  });

  it('answers NotFoundError when every diagnostic is completed', async () => {
    const result = await query([
      diagnosis(DONE, 'DEEP_ANALYSIS_COMPLETE', '2026-10-15T00:00:00Z'),
    ]).execute('user-1');

    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
