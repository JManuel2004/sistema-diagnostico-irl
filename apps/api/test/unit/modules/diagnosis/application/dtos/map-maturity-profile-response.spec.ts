import { aDimensionCatalog } from '../../../../support/dimension-catalog.js';
import { toMaturityProfileResponse } from '../../../../../../src/modules/diagnosis/application/dtos/map-maturity-profile-response.js';
import { MaturityProfile } from '../../../../../../src/modules/diagnosis/domain/entities/maturity-profile.aggregate.js';
import { DimensionResult } from '../../../../../../src/modules/diagnosis/domain/value-objects/dimension-result.vo.js';
import { DimensionCode } from '../../../../../../src/shared/kernel/domain/value-objects/dimension-code.js';
import { IrlLevel } from '../../../../../../src/shared/kernel/domain/value-objects/irl-level.vo.js';
import { Uuid } from '../../../../../../src/shared/kernel/domain/value-objects/uuid.vo.js';

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

    const dto = toMaturityProfileResponse(profile, [], aDimensionCatalog());

    expect(dto.gaps.threshold).toBe(3);
    expect(dto.gaps.dimensions).toEqual(['CRL', 'BRL', 'IPRL', 'FRL']);
  });

  // RF-13: The critical state comes from the backend. A gap in TRL,
  // IPRL or FRL is a gap, not a critical state.
  it('exposes the critical dimensions: only CRL, BRL and TmRL, and only when in gap', () => {
    const profile = MaturityProfile.create({
      diagnosticId,
      computedAt,
      dimensionResults: [
        resultFor('TRL', 2),
        resultFor('CRL', 3),
        resultFor('BRL', 4),
        resultFor('IPRL', 1),
        resultFor('TmRL', 2),
        resultFor('FRL', 3),
      ],
    });

    const dto = toMaturityProfileResponse(profile, [], aDimensionCatalog());

    expect(dto.gaps.dimensions).toEqual(['TRL', 'CRL', 'IPRL', 'TmRL', 'FRL']);
    expect(dto.criticalState.dimensions).toEqual(['CRL', 'TmRL']);
  });

  it('exposes an empty critical state when no susceptible dimension is in gap', () => {
    const profile = MaturityProfile.create({
      diagnosticId,
      computedAt,
      dimensionResults: CODES.map((c) => resultFor(c, 6)),
    });

    expect(toMaturityProfileResponse(profile, [], aDimensionCatalog()).criticalState).toEqual({
      dimensions: [],
    });
  });

  it('exposes an empty gaps list when no dimension is at or below the threshold', () => {
    const profile = MaturityProfile.create({
      diagnosticId,
      computedAt,
      dimensionResults: CODES.map((c) => resultFor(c, 6)),
    });

    const dto = toMaturityProfileResponse(profile, [], aDimensionCatalog());

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

    const dto = toMaturityProfileResponse(profile, [], aDimensionCatalog());

    expect(dto.strength).toEqual({ dimensions: ['TRL'], level: 5 });
    expect(dto.asymmetry).toEqual({
      difference: 3,
      classification: 'moderate',
    });
  });

  it('exposes the global average computed by the aggregate, not derived by the client', () => {
    const profile = MaturityProfile.create({
      diagnosticId,
      computedAt,
      dimensionResults: [
        resultFor('TRL', 6),
        resultFor('CRL', 4),
        resultFor('BRL', 3),
        resultFor('IPRL', 1),
        resultFor('TmRL', 5),
        resultFor('FRL', 2),
      ],
    });

    const dto = toMaturityProfileResponse(profile, [], aDimensionCatalog());

    expect(dto.globalAverage).toBe(3.5);
  });

  // `name` used to be the dimension code, so the frontend kept
  // its own name maps. The names come from the catalog.
  it('names each dimension from the catalog, never by its code', () => {
    const profile = MaturityProfile.create({
      diagnosticId,
      computedAt,
      dimensionResults: CODES.map((c) => resultFor(c, 5)),
    });

    const dto = toMaturityProfileResponse(profile, [], aDimensionCatalog());

    expect(dto.dimensionResults.map((r) => [r.dimensionCode, r.name, r.shortName])).toEqual(
      CODES.map((c) => [c, `Nombre completo ${c}`, `Corto ${c}`]),
    );
  });

  it('fails when the catalog is missing a dimension of the profile', () => {
    const profile = MaturityProfile.create({
      diagnosticId,
      computedAt,
      dimensionResults: CODES.map((c) => resultFor(c, 5)),
    });

    expect(() => toMaturityProfileResponse(profile, [], aDimensionCatalog().slice(1))).toThrow(
      /catalog has no entry/,
    );
  });
});
