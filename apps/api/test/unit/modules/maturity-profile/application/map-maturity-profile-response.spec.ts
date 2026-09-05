import { toMaturityProfileResponse } from '../../../../../src/modules/maturity-profile/application/map-maturity-profile-response.js';
import { MaturityProfile } from '../../../../../src/modules/maturity-profile/domain/entities/maturity-profile.aggregate.js';
import { DimensionResult } from '../../../../../src/modules/maturity-profile/domain/value-objects/dimension-result.vo.js';
import { DimensionCode } from '../../../../../src/shared-kernel/domain/value-objects/dimension-code.js';
import { IrlLevel } from '../../../../../src/shared-kernel/domain/value-objects/irl-level.vo.js';
import { Uuid } from '../../../../../src/shared-kernel/domain/value-objects/uuid.vo.js';

const CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

function resultFor(code: (typeof CODES)[number], level: number): DimensionResult {
  return DimensionResult.create({
    dimensionCode: DimensionCode.create(code),
    averageLikert: 3.0,
    irlLevel: IrlLevel.create(level),
  });
}

describe('toMaturityProfileResponse', () => {
  const diagnosticId = Uuid.create('550e8400-e29b-41d4-a716-446655440000');
  const computedAt = new Date('2026-05-22T10:00:00Z');

  it('exposes gaps computed by the aggregate, including the threshold', () => {
    const profile = MaturityProfile.create({
      diagnosticId,
      computedAt,
      dimensionResults: [
        resultFor('TRL', 5),
        resultFor('CRL', 3),
        resultFor('BRL', 3),
        resultFor('IPRL', 2),
        resultFor('TmRL', 4),
        resultFor('FRL', 3),
      ],
    });

    const dto = toMaturityProfileResponse(profile, []);

    expect(dto.gaps.threshold).toBe(3);
    expect(dto.gaps.dimensions).toEqual(['CRL', 'BRL', 'IPRL', 'FRL']);
  });

  it('exposes an empty gaps list when no dimension is at or below the threshold', () => {
    const profile = MaturityProfile.create({
      diagnosticId,
      computedAt,
      dimensionResults: CODES.map((c) => resultFor(c, 6)),
    });

    const dto = toMaturityProfileResponse(profile, []);

    expect(dto.gaps.dimensions).toEqual([]);
    expect(dto.gaps.threshold).toBe(3);
  });

  it('exposes strength and asymmetry from persisted levels', () => {
    const profile = MaturityProfile.create({
      diagnosticId,
      computedAt,
      dimensionResults: [
        resultFor('TRL', 5),
        resultFor('CRL', 3),
        resultFor('BRL', 3),
        resultFor('IPRL', 2),
        resultFor('TmRL', 4),
        resultFor('FRL', 3),
      ],
    });

    const dto = toMaturityProfileResponse(profile, []);

    expect(dto.strength).toEqual({ dimensions: ['TRL'], level: 5 });
    expect(dto.asymmetry).toEqual({ difference: 3, classification: 'moderate' });
  });
});
