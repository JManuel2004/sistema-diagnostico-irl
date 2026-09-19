import { jest } from '@jest/globals';
import type { DimensionCode } from '@innlab/contracts';
import { GenerateScalingRoadmapUseCase } from '../../../../../../src/modules/roadmap/application/use-cases/generate-scaling-roadmap.use-case.js';
import type { DependencyGraphRepositoryPort } from '../../../../../../src/modules/roadmap/domain/repositories/dependency-graph.repository.port.js';
import type { GetMaturityProfileUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/get-maturity-profile.use-case.js';
import { RoadmapClosureService } from '../../../../../../src/modules/roadmap/domain/services/roadmap-closure.service.js';
import { TopologicalLayeringService } from '../../../../../../src/modules/roadmap/domain/services/topological-layering.service.js';
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

describe('GenerateScalingRoadmapUseCase', () => {
  let profiles: jest.Mock<GetMaturityProfileUseCase['execute']>;
  let useCase: GenerateScalingRoadmapUseCase;

  beforeEach(() => {
    profiles = jest.fn();
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
    };
    useCase = new GenerateScalingRoadmapUseCase(
      graphs,
      { execute: profiles } as unknown as GetMaturityProfileUseCase,
      new RoadmapClosureService(),
      new TopologicalLayeringService(),
      new TargetLevelCalculatorService(),
    );
  });

  it('calculates the roadmap for the AgroConecta profile', async () => {
    profiles.mockResolvedValueOnce(Result.ok(profileOf(AGROCONECTA_LEVELS)));

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(
      result.value.phases.map((p) => p.dimensions.map((d) => d.dimensionCode)),
    ).toEqual([['BRL', 'IPRL'], ['FRL']]);
  });

  it('propagates the profile error', async () => {
    profiles.mockResolvedValueOnce(
      Result.err(new ConflictError('PROFILE_NOT_YET_COMPUTED')),
    );

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    expect(result.ok).toBe(false);
  });
});
