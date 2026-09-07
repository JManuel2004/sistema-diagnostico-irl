import { jest } from '@jest/globals';
import { GetMaturityProfileUseCase } from '../../../../../src/modules/maturity-profile/application/get-maturity-profile.use-case.js';
import type { MaturityProfileRepositoryPort } from '../../../../../src/modules/maturity-profile/domain/ports/maturity-profile.repository.port.js';
import type { ImbalanceRepositoryPort } from '../../../../../src/modules/maturity-profile/domain/ports/imbalance.repository.port.js';
import { MaturityProfile } from '../../../../../src/modules/maturity-profile/domain/entities/maturity-profile.aggregate.js';
import { DimensionResult } from '../../../../../src/modules/maturity-profile/domain/value-objects/dimension-result.vo.js';
import { ImbalanceResult } from '../../../../../src/modules/maturity-profile/domain/value-objects/imbalance-result.vo.js';
import { DimensionCode } from '../../../../../src/shared-kernel/domain/value-objects/dimension-code.js';
import { IrlLevel } from '../../../../../src/shared-kernel/domain/value-objects/irl-level.vo.js';
import { Uuid } from '../../../../../src/shared-kernel/domain/value-objects/uuid.vo.js';
import { ConflictError } from '../../../../../src/shared-kernel/domain/errors/conflict.error.js';

const DIAGNOSTIC_ID = '550e8400-e29b-41d4-a716-446655440000';
const CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

function aProfile(): MaturityProfile {
  return MaturityProfile.create({
    diagnosticId: Uuid.create(DIAGNOSTIC_ID),
    computedAt: new Date('2026-01-01T12:00:00.000Z'),
    dimensionResults: CODES.map((code) =>
      DimensionResult.create({
        dimensionCode: DimensionCode.create(code),
        averageLikert: 3,
        irlLevel: IrlLevel.create(6),
      }),
    ),
  });
}

const STORED_PAIRS: ImbalanceResult[] = [
  new ImbalanceResult(1, DimensionCode.create('TRL'), DimensionCode.create('CRL'), 2, 'MODERADO'),
  new ImbalanceResult(2, DimensionCode.create('TRL'), DimensionCode.create('BRL'), 0, 'ACEPTABLE'),
  new ImbalanceResult(3, DimensionCode.create('CRL'), DimensionCode.create('BRL'), 0, 'ACEPTABLE'),
  new ImbalanceResult(4, DimensionCode.create('TmRL'), DimensionCode.create('FRL'), 1, 'ACEPTABLE'),
  new ImbalanceResult(5, DimensionCode.create('BRL'), DimensionCode.create('IPRL'), 1, 'ACEPTABLE'),
  new ImbalanceResult(6, DimensionCode.create('TRL'), DimensionCode.create('IPRL'), 4, 'CRITICO'),
];

describe('GetMaturityProfileUseCase', () => {
  let profiles: jest.Mocked<MaturityProfileRepositoryPort>;
  let imbalances: jest.Mocked<ImbalanceRepositoryPort>;
  let useCase: GetMaturityProfileUseCase;

  beforeEach(() => {
    profiles = {
      findByDiagnosticId: jest.fn(),
      save: jest.fn(() => Promise.resolve(undefined)),
    };
    imbalances = {
      findByDiagnosticId: jest.fn(() => Promise.resolve([])),
      save: jest.fn(() => Promise.resolve(undefined)),
    };
    useCase = new GetMaturityProfileUseCase(profiles, imbalances);
  });

  it('returns the persisted profile and stored imbalances without recomputing', async () => {
    profiles.findByDiagnosticId.mockResolvedValueOnce(aProfile());
    imbalances.findByDiagnosticId.mockResolvedValueOnce(STORED_PAIRS);

    const dto = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    expect(imbalances.findByDiagnosticId).toHaveBeenCalledWith(DIAGNOSTIC_ID);
    expect(dto.imbalances).toHaveLength(6);
    expect(dto.imbalances?.find((p) => p.left === 'TRL' && p.right === 'IPRL')).toEqual({
      left: 'TRL',
      right: 'IPRL',
      difference: 4,
      classification: 'critical',
    });
    expect(dto.strength.level).toBe(6);
    expect(dto.asymmetry.difference).toBe(0);
  });

  it('does not invent imbalances when none were persisted', async () => {
    profiles.findByDiagnosticId.mockResolvedValueOnce(aProfile());
    imbalances.findByDiagnosticId.mockResolvedValueOnce([]);

    const dto = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    expect(dto.imbalances).toBeUndefined();
  });

  it('throws when the profile has not been computed', async () => {
    profiles.findByDiagnosticId.mockResolvedValueOnce(null);

    await expect(useCase.execute({ diagnosticId: DIAGNOSTIC_ID })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(imbalances.findByDiagnosticId).not.toHaveBeenCalled();
  });
});
