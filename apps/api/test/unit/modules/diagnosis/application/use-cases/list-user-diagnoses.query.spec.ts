import { jest } from '@jest/globals';
import { diagnosticSummarySchema } from '@innlab/contracts';
import { ListUserDiagnosesQuery } from '../../../../../../src/modules/diagnosis/application/use-cases/list-user-diagnoses.query.js';
import type { DiagnosisRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/diagnosis.repository.port.js';
import type { MaturityProfileRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/maturity-profile.repository.port.js';
import { MaturityProfile } from '../../../../../../src/modules/diagnosis/domain/entities/maturity-profile.aggregate.js';
import { DimensionResult } from '../../../../../../src/modules/diagnosis/domain/value-objects/dimension-result.vo.js';
import { DimensionCode } from '../../../../../../src/shared/kernel/domain/value-objects/dimension-code.js';
import { IrlLevel } from '../../../../../../src/shared/kernel/domain/value-objects/irl-level.vo.js';
import { Uuid } from '../../../../../../src/shared/kernel/domain/value-objects/uuid.vo.js';
import { frameworkTaxonomy } from '../../support/framework-taxonomy.js';
import { Diagnosis } from '../../../../../../src/modules/diagnosis/domain/entities/diagnosis.aggregate.js';

const INCOMPLETE = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
const PROFILED = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const DEEP = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';

function diagnosis(id: string, state: string): Diagnosis {
  return Diagnosis.fromPersistence({
    id,
    userId: 'user-1',
    state,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    frameworkVersionId: 1,
  });
}

/** AgroConecta's levels: average 3.5. */
function profile(id: string): MaturityProfile {
  const levels = { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 } as const;
  return MaturityProfile.create({
    diagnosticId: Uuid.create(id),
    computedAt: new Date('2026-09-30T15:00:00.000Z'),
    dimensionResults: Object.entries(levels).map(([code, level]) =>
      DimensionResult.create({
        dimensionCode: DimensionCode.create(code),
        averageLikert: 2,
        irlLevel: IrlLevel.create(level),
      }),
    ),
  });
}

function query(rows: Diagnosis[]) {
  const findAllByUserId = jest
    .fn<DiagnosisRepositoryPort['findAllByUserId']>()
    .mockResolvedValueOnce(rows);
  const findByDiagnosticId = jest
    .fn<MaturityProfileRepositoryPort['findByDiagnosticId']>()
    .mockImplementation((id) => Promise.resolve(profile(id)));
  return {
    findAllByUserId,
    findByDiagnosticId,
    query: new ListUserDiagnosesQuery(
      { findAllByUserId } as unknown as DiagnosisRepositoryPort,
      { findByDiagnosticId } as unknown as MaturityProfileRepositoryPort,
      frameworkTaxonomy(),
    ),
  };
}

describe('ListUserDiagnosesQuery', () => {
  it('lists only the completed diagnostics of the user, in the repository order', async () => {
    const { query: q, findAllByUserId } = query([
      diagnosis(INCOMPLETE, 'WITH_INITIATIVE'),
      diagnosis(DEEP, 'DEEP_ANALYSIS_COMPLETE'),
      diagnosis(PROFILED, 'PROFILE_GENERATED'),
    ]);

    const result = await q.execute('user-1');

    expect(findAllByUserId).toHaveBeenCalledWith('user-1');
    expect(
      result.map((d) => [d.id, d.completed, d.deepAnalysisAccepted]),
    ).toEqual([
      [DEEP, true, true],
      [PROFILED, true, false],
    ]);
  });

  it('gives each one when its profile was computed and its global level, as stored', async () => {
    const { query: q, findByDiagnosticId } = query([
      diagnosis(PROFILED, 'PROFILE_GENERATED'),
    ]);

    const [summary] = await q.execute('user-1');

    expect(findByDiagnosticId).toHaveBeenCalledWith(PROFILED);
    expect(summary.profileComputedAt).toBe('2026-09-30T15:00:00.000Z');
    expect(summary.globalAverage).toBe(3.5);
    expect(summary.frameworkVersion).toBe('KTH-IRL-1.0');
    // The initiative's name is added by `initiative/`; the rest is the contract's.
    expect(() =>
      diagnosticSummarySchema.parse({ ...summary, initiativeName: null }),
    ).not.toThrow();
  });

  it('does not read any profile when the user has no completed diagnostic', async () => {
    const { query: q, findByDiagnosticId } = query([
      diagnosis(INCOMPLETE, 'STARTED'),
    ]);

    await expect(q.execute('user-1')).resolves.toEqual([]);
    expect(findByDiagnosticId).not.toHaveBeenCalled();
  });
});
