import { jest } from '@jest/globals';
import { FindDiagnosisOwnerQuery } from '../../../../../../src/modules/diagnosis/application/use-cases/find-diagnosis-owner.query.js';
import type { DiagnosisRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/diagnosis.repository.port.js';
import { Diagnosis } from '../../../../../../src/modules/diagnosis/domain/entities/diagnosis.aggregate.js';

const ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('FindDiagnosisOwnerQuery', () => {
  const findById = jest.fn<DiagnosisRepositoryPort['findById']>();
  const query = new FindDiagnosisOwnerQuery({
    findById,
  } as unknown as DiagnosisRepositoryPort);

  it("returns the owner's user id", async () => {
    findById.mockResolvedValueOnce(
      Diagnosis.fromPersistence({
        id: ID,
        userId: 'user-1',
        state: 'STARTED',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    );
    await expect(query.execute(ID)).resolves.toBe('user-1');
  });

  it('returns null when the diagnostic does not exist', async () => {
    findById.mockResolvedValueOnce(null);
    await expect(query.execute(ID)).resolves.toBeNull();
  });
});
