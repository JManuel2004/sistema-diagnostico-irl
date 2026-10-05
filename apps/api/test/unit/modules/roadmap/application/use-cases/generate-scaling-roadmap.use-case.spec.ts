import { jest } from '@jest/globals';
import type { DimensionCode } from '@innlab/contracts';
import { GenerateScalingRoadmapUseCase } from '../../../../../../src/modules/roadmap/application/use-cases/generate-scaling-roadmap.use-case.js';
import type { DependencyGraphRepositoryPort } from '../../../../../../src/modules/roadmap/domain/repositories/dependency-graph.repository.port.js';
import type { RoadmapRepositoryPort } from '../../../../../../src/modules/roadmap/domain/repositories/roadmap.repository.port.js';
import type { GetMaturityProfileUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/get-maturity-profile.use-case.js';
import { RoadmapClosureService } from '../../../../../../src/modules/roadmap/domain/services/roadmap-closure.service.js';
import { RoadmapBalancingService } from '../../../../../../src/modules/roadmap/domain/services/roadmap-balancing.service.js';
import { PhasePlannerService } from '../../../../../../src/modules/roadmap/domain/services/phase-planner.service.js';
import type {
  PhaseServiceAdvisorPort,
  PhaseServiceRequest,
} from '../../../../../../src/modules/roadmap/domain/repositories/phase-service-advisor.port.js';
import { ROADMAP_PARAMETERS } from '../../../../../../src/shared/kernel/infrastructure/database/seeds/data/roadmap-parameters.js';
import { TargetLevelCalculatorService } from '../../../../../../src/modules/roadmap/domain/services/target-level-calculator.service.js';
import { DIMENSIONS } from '../../../../../../src/shared/kernel/infrastructure/database/seeds/data/dimensions.js';
import { DIMENSION_DEPENDENCIES } from '../../../../../../src/shared/kernel/infrastructure/database/seeds/data/dimension-dependencies.js';
import { ConflictError } from '../../../../../../src/shared/kernel/domain/errors/conflict.error.js';
import { Result } from '../../../../../../src/shared/kernel/domain/result.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const AGROCONECTA_LEVELS: Record<DimensionCode, number> = {
  TRL: 6,
  CRL: 4,
  BRL: 3,
  IPRL: 1,
  TmRL: 5,
  FRL: 2,
};

function profileOf(levels: Record<DimensionCode, number>) {
  return {
    dimensionResults: (Object.keys(levels) as DimensionCode[]).map((code) => ({
      dimensionCode: code,
      irlLevel: levels[code],
    })),
  } as never;
}

const EMPTY_TRACE = {
  mode: 'PHASE' as const,
  projectedLevels: AGROCONECTA_LEVELS,
  averageLevel: 3.5,
  excluded: [],
  skipped: [],
  ranking: [],
  appliedAdjustments: [],
};

/** The portfolio as a script: one answer per phase, in order. */
function scriptedAdvisor(
  answers: ({
    idService: number;
    name: string;
    tierOrder: number;
    approximate?: boolean;
  } | null)[],
) {
  const requests: PhaseServiceRequest[] = [];
  const advisor: PhaseServiceAdvisorPort = {
    advise: (request) => {
      requests.push(request);
      const answer = answers[requests.length - 1] ?? null;
      return Promise.resolve({
        service: answer ? { approximate: false, ...answer } : null,
        trace: EMPTY_TRACE,
      });
    },
    describe: () => Promise.resolve(new Map()),
  };
  return { advisor, requests };
}

describe('GenerateScalingRoadmapUseCase', () => {
  let profiles: jest.Mock<GetMaturityProfileUseCase['execute']>;
  let useCase: GenerateScalingRoadmapUseCase;
  let save: jest.Mock<RoadmapRepositoryPort['save']>;
  let requests: PhaseServiceRequest[];

  beforeEach(() => {
    profiles = jest.fn();
    save = jest
      .fn<RoadmapRepositoryPort['save']>()
      .mockResolvedValue(undefined);
    const graphs: DependencyGraphRepositoryPort = {
      findEdges: () =>
        Promise.resolve(
          DIMENSION_DEPENDENCIES.map((a) => ({
            source: a.source as DimensionCode,
            target: a.target as DimensionCode,
            minimumRequiredLevel: a.minimumRequiredLevel,
          })),
        ),
      findExpectedMinimums: () =>
        Promise.resolve(
          DIMENSIONS.map((d) => ({
            dimension: d.code,
            minimumExpectedLevel: d.minimumExpectedLevel,
          })),
        ),
      findParameters: () => Promise.resolve({ ...ROADMAP_PARAMETERS }),
    };
    const scripted = scriptedAdvisor([
      { idService: 2, name: 'Reto Express', tierOrder: 1 },
      { idService: 4, name: 'Reto en el Aula', tierOrder: 2 },
      {
        idService: 5,
        name: 'Semillero con Propósito',
        tierOrder: 2,
        approximate: true,
      },
    ]);
    requests = scripted.requests;
    useCase = new GenerateScalingRoadmapUseCase(
      graphs,
      { execute: profiles } as unknown as GetMaturityProfileUseCase,
      new RoadmapClosureService(),
      new TargetLevelCalculatorService(),
      new RoadmapBalancingService(),
      new PhasePlannerService(),
      scripted.advisor,
      {
        save,
        findByDiagnosticId: jest.fn(),
      } as unknown as RoadmapRepositoryPort,
    );
  });

  it('calculates the balanced roadmap for AgroConecta, at most two levels per phase', async () => {
    profiles.mockResolvedValueOnce(Result.ok(profileOf(AGROCONECTA_LEVELS)));

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(
      result.value.phases.map((p) =>
        p.dimensions.map((d) => [
          d.dimensionCode,
          d.currentLevel,
          d.targetLevel,
        ]),
      ),
    ).toEqual([
      [
        ['CRL', 4, 5],
        ['IPRL', 1, 3],
      ],
      [
        ['BRL', 3, 5],
        ['IPRL', 3, 5],
      ],
      [['FRL', 2, 4]],
    ]);
    expect(result.value.finalLevels).toEqual({
      TRL: 6,
      CRL: 5,
      BRL: 5,
      IPRL: 5,
      TmRL: 5,
      FRL: 4,
    });
    expect(result.value.balanced).toBe(true);
  });

  it('a dimension that only rises to keep up with its pair enters by BALANCE', async () => {
    profiles.mockResolvedValueOnce(Result.ok(profileOf(AGROCONECTA_LEVELS)));

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    if (!result.ok) throw new Error('expected ok result');
    const [crl] = result.value.phases[0].dimensions;
    expect(crl).toMatchObject({
      dimensionCode: 'CRL',
      inclusionReason: 'BALANCE',
      targetReason: 'BALANCE',
      targetDrivenBy: 'TRL',
      finalTargetLevel: 5,
    });
  });

  it('asks a service per phase: the recommendation first, then by phase, never lighter nor repeated', async () => {
    profiles.mockResolvedValueOnce(Result.ok(profileOf(AGROCONECTA_LEVELS)));

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    if (!result.ok) throw new Error('expected ok result');
    expect(
      requests.map((r) => [r.mode, r.minimumTierOrder, r.excludedServiceIds]),
    ).toEqual([
      ['RECOMMENDATION', 1, []],
      ['PHASE', 1, [2]],
      ['PHASE', 2, [2, 4]],
    ]);
    // Each phase starts from the profile the previous ones leave.
    expect(requests[1].levels).toMatchObject({ CRL: 5, IPRL: 3, BRL: 3 });
    expect(requests[2].levels).toMatchObject({ BRL: 5, IPRL: 5, FRL: 2 });
    expect(requests[2].work).toEqual([
      { dimension: 'FRL', fromLevel: 2, toLevel: 4 },
    ]);
    expect(result.value.phases.map((p) => p.service?.name)).toEqual([
      'Reto Express',
      'Reto en el Aula',
      'Semillero con Propósito',
    ]);
    expect(result.value.phases[2].service?.approximate).toBe(true);
  });

  it('without a routing configuration the phases stay, with no service', async () => {
    profiles.mockResolvedValueOnce(Result.ok(profileOf(AGROCONECTA_LEVELS)));
    const silent: PhaseServiceAdvisorPort = {
      advise: () => Promise.resolve(null),
      describe: () => Promise.resolve(new Map()),
    };
    const graphs = (
      useCase as unknown as { graphs: DependencyGraphRepositoryPort }
    ).graphs;
    const withoutPortfolio = new GenerateScalingRoadmapUseCase(
      graphs,
      { execute: profiles } as unknown as GetMaturityProfileUseCase,
      new RoadmapClosureService(),
      new TargetLevelCalculatorService(),
      new RoadmapBalancingService(),
      new PhasePlannerService(),
      silent,
      {
        save,
        findByDiagnosticId: jest.fn(),
      } as unknown as RoadmapRepositoryPort,
    );

    const result = await withoutPortfolio.execute({
      diagnosticId: DIAGNOSTIC_ID,
    });

    if (!result.ok) throw new Error('expected ok result');
    expect(result.value.phases).toHaveLength(3);
    expect(result.value.phases.every((p) => p.service === null)).toBe(true);
  });

  it('saves the roadmap it calculates', async () => {
    profiles.mockResolvedValueOnce(Result.ok(profileOf(AGROCONECTA_LEVELS)));

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    if (!result.ok) throw new Error('expected ok result');
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(result.value);
  });

  it('records why each dimension is in the plan and what sets its target', async () => {
    profiles.mockResolvedValueOnce(Result.ok(profileOf(AGROCONECTA_LEVELS)));

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    if (!result.ok) throw new Error('expected ok result');
    const byCode = new Map(
      result.value.phases
        .flatMap((p) => p.dimensions)
        .map((d) => [d.dimensionCode, d]),
    );
    // Below its own minimum, and the target is that minimum.
    expect(byCode.get('FRL')).toMatchObject({
      inclusionReason: 'BELOW_EXPECTED_MINIMUM',
      targetDrivenBy: null,
    });
    // Every dimension carries the minimum that explains its inclusion.
    for (const d of byCode.values()) {
      expect(d.expectedMinimum).toBeGreaterThan(0);
      if (d.inclusionReason === 'BELOW_EXPECTED_MINIMUM') {
        expect(d.currentLevel).toBeLessThan(d.expectedMinimum);
      }
    }
  });

  it('does not save when the profile is missing', async () => {
    profiles.mockResolvedValueOnce(
      Result.err(new ConflictError('PROFILE_NOT_YET_COMPUTED')),
    );

    await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    expect(save).not.toHaveBeenCalled();
  });

  it('propagates the profile error', async () => {
    profiles.mockResolvedValueOnce(
      Result.err(new ConflictError('PROFILE_NOT_YET_COMPUTED')),
    );

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    expect(result.ok).toBe(false);
  });
});
