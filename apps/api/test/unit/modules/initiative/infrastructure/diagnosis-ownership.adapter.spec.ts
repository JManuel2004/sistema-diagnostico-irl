import { jest } from '@jest/globals';
import { DiagnosisOwnershipAdapter } from '../../../../../src/modules/initiative/infrastructure/diagnosis-ownership.adapter.js';
import type { DiagnosisRepositoryPort } from '../../../../../src/modules/diagnosis/domain/repositories/diagnosis.repository.port.js';
import { Diagnosis } from '../../../../../src/modules/diagnosis/domain/entities/diagnosis.aggregate.js';
import { ForbiddenError } from '../../../../../src/shared/kernel/domain/errors/forbidden.error.js';
import { NotFoundError } from '../../../../../src/shared/kernel/domain/errors/not-found.error.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function ownedBy(userId: string): Diagnosis {
  return Diagnosis.fromPersistence({
    id: DIAGNOSTIC_ID,
    userId,
    state: 'STARTED',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('DiagnosisOwnershipAdapter', () => {
  let diagnostics: jest.Mocked<DiagnosisRepositoryPort>;
  let adapter: DiagnosisOwnershipAdapter;

  beforeEach(() => {
    diagnostics = {
      findById: jest.fn(),
      findLatestByUserId: jest.fn(),
      findAllByUserId: jest.fn(),
      save: jest.fn(),
    };
    adapter = new DiagnosisOwnershipAdapter(diagnostics);
  });

  it('succeeds when the diagnostic belongs to the user', async () => {
    diagnostics.findById.mockResolvedValueOnce(ownedBy('user-1'));

    const result = await adapter.verify(DIAGNOSTIC_ID, 'user-1');

    expect(result.ok).toBe(true);
  });

  it('returns NotFoundError when the diagnostic does not exist', async () => {
    diagnostics.findById.mockResolvedValueOnce(null);

    const result = await adapter.verify(DIAGNOSTIC_ID, 'user-1');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('returns ForbiddenError when the diagnostic belongs to another user', async () => {
    diagnostics.findById.mockResolvedValueOnce(ownedBy('someone-else'));

    const result = await adapter.verify(DIAGNOSTIC_ID, 'user-1');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(ForbiddenError);
  });

  it('rejects a malformed id before querying the repository', async () => {
    await expect(adapter.verify('not-a-uuid', 'user-1')).rejects.toThrow();
    expect(diagnostics.findById).not.toHaveBeenCalled();
  });
});
