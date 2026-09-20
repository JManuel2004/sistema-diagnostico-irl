import { jest } from '@jest/globals';
import { roadmapResponseSchema } from '@innlab/contracts';
import { GetScalingRoadmapUseCase } from '../../../../../../src/modules/roadmap/application/use-cases/get-scaling-roadmap.use-case.js';
import type { GenerateScalingRoadmapUseCase } from '../../../../../../src/modules/roadmap/application/use-cases/generate-scaling-roadmap.use-case.js';
import type { TaxonomyRepositoryPort } from '../../../../../../src/shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import { ScalingRoadmap } from '../../../../../../src/modules/roadmap/domain/entities/scaling-roadmap.aggregate.js';
import { ConflictError } from '../../../../../../src/shared/kernel/domain/errors/conflict.error.js';
import { Result } from '../../../../../../src/shared/kernel/domain/result.js';
import { Uuid } from '../../../../../../src/shared/kernel/domain/value-objects/uuid.vo.js';
import { aDimensionCatalog } from '../../../../support/dimension-catalog.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function aRoadmap(): ScalingRoadmap {
  return ScalingRoadmap.create({
    diagnosticId: Uuid.create(DIAGNOSTIC_ID),
    generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    phases: [
      {
        order: 1,
        dimensions: [
          {
            dimensionCode: 'BRL',
            currentLevel: 3,
            targetLevel: 4,
            enables: ['FRL'],
          },
          {
            dimensionCode: 'IPRL',
            currentLevel: 1,
            targetLevel: 4,
            enables: ['FRL'],
          },
        ],
      },
      {
        order: 2,
        dimensions: [
          {
            dimensionCode: 'FRL',
            currentLevel: 2,
            targetLevel: 4,
            enables: [],
          },
        ],
      },
    ],
  });
}

describe('GetScalingRoadmapUseCase', () => {
  let generate: jest.Mock<GenerateScalingRoadmapUseCase['execute']>;
  let useCase: GetScalingRoadmapUseCase;

  beforeEach(() => {
    generate = jest.fn();
    useCase = new GetScalingRoadmapUseCase(
      { execute: generate } as unknown as GenerateScalingRoadmapUseCase,
      {
        findAllDimensions: () => Promise.resolve(aDimensionCatalog()),
      } as unknown as TaxonomyRepositoryPort,
    );
  });

  // Backlog 4.5: the roadmap names its dimensions from the catalog, so the
  // frontend keeps no name map.
  it('names every dimension of the roadmap from the catalog', async () => {
    generate.mockResolvedValueOnce(Result.ok(aRoadmap()));

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    const dto = result.value;

    expect(() => roadmapResponseSchema.parse(dto)).not.toThrow();
    expect(dto.phases[0].dimensions[0]).toMatchObject({
      dimensionCode: 'BRL',
      name: 'Nombre completo BRL',
      shortName: 'Corto BRL',
      enables: [
        { code: 'FRL', name: 'Nombre completo FRL', shortName: 'Corto FRL' },
      ],
    });
    expect(dto.dimensionsWithoutIntervention.map((d) => d.code)).toEqual([
      'TRL',
      'CRL',
      'TmRL',
    ]);
    expect(dto.dimensionsWithoutIntervention[0]).toEqual({
      code: 'TRL',
      name: 'Nombre completo TRL',
      shortName: 'Corto TRL',
    });
  });

  it('propagates the profile error', async () => {
    generate.mockResolvedValueOnce(
      Result.err(new ConflictError('PROFILE_NOT_YET_COMPUTED')),
    );

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    expect(result.ok).toBe(false);
  });
});
