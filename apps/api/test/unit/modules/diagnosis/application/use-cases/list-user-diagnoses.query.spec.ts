import { jest } from '@jest/globals';
import { diagnosticSummarySchema } from '@innlab/contracts';
import { ListUserDiagnosesQuery } from '../../../../../../src/modules/diagnosis/application/use-cases/list-user-diagnoses.query.js';
import type { DiagnosisRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/diagnosis.repository.port.js';
import { Diagnosis } from '../../../../../../src/modules/diagnosis/domain/entities/diagnosis.aggregate.js';

function diagnosis(id: string, state: string): Diagnosis {
  return Diagnosis.fromPersistence({
    id,
    userId: 'user-1',
    state,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  });
}

describe('ListUserDiagnosesQuery', () => {
  it("returns the user's diagnostics as contract summaries, in the repository's order", async () => {
    const findAllByUserId =
      jest.fn<DiagnosisRepositoryPort['findAllByUserId']>();
    findAllByUserId.mockResolvedValueOnce([
      diagnosis('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'STARTED'),
      diagnosis('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PROFILE_GENERATED'),
    ]);
    const query = new ListUserDiagnosesQuery({
      findAllByUserId,
    } as unknown as DiagnosisRepositoryPort);

    const result = await query.execute('user-1');

    expect(findAllByUserId).toHaveBeenCalledWith('user-1');
    expect(() => diagnosticSummarySchema.array().parse(result)).not.toThrow();
    expect(result.map((d) => [d.state, d.completed])).toEqual([
      ['STARTED', false],
      ['PROFILE_GENERATED', true],
    ]);
  });
});
