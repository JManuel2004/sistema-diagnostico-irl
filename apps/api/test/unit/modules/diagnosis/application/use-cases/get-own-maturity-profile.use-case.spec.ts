import { jest } from '@jest/globals';
import type { MaturityProfileResponse } from '@innlab/contracts';
import { GetOwnMaturityProfileUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/get-own-maturity-profile.use-case.js';
import type { GetMaturityProfileUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/get-maturity-profile.use-case.js';
import type { DiagnosisRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/diagnosis.repository.port.js';
import { Diagnosis } from '../../../../../../src/modules/diagnosis/domain/entities/diagnosis.aggregate.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../../../src/shared/kernel/domain/result.js';

const ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('GetOwnMaturityProfileUseCase', () => {
  const owned = Diagnosis.fromPersistence({
    id: ID,
    userId: 'user-1',
    state: 'PROFILE_GENERATED',
    createdAt: new Date(),
    frameworkVersionId: 1,
  });
  const profile = { diagnosticId: ID } as MaturityProfileResponse;
  let getProfile: { execute: jest.Mock<GetMaturityProfileUseCase['execute']> };
  let useCase: GetOwnMaturityProfileUseCase;

  beforeEach(() => {
    getProfile = { execute: jest.fn(() => Promise.resolve(Result.ok(profile))) };
    useCase = new GetOwnMaturityProfileUseCase(
      { findById: () => Promise.resolve(owned) } as unknown as DiagnosisRepositoryPort,
      getProfile as unknown as GetMaturityProfileUseCase,
    );
  });

  it('serves the profile to the owner of the diagnostic', async () => {
    const result = await useCase.execute({ diagnosticId: ID, userId: 'user-1' });

    expect(result).toEqual(Result.ok(profile));
  });

  it("answers someone else's diagnostic as missing, without reading the profile", async () => {
    const result = await useCase.execute({ diagnosticId: ID, userId: 'user-2' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(NotFoundError);
    expect(getProfile.execute).not.toHaveBeenCalled();
  });
});
