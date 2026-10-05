import { Result } from '../../../../../../src/shared/kernel/domain/result.js';
import { jest } from '@jest/globals';
import { roadmapResponseSchema } from '@innlab/contracts';
import { GetScalingRoadmapUseCase } from '../../../../../../src/modules/roadmap/application/use-cases/get-scaling-roadmap.use-case.js';
import type { RoadmapRepositoryPort } from '../../../../../../src/modules/roadmap/domain/repositories/roadmap.repository.port.js';
import { RoadmapNotGeneratedError } from '../../../../../../src/modules/roadmap/domain/exceptions/roadmap.errors.js';
import type { TaxonomyRepositoryPort } from '../../../../../../src/shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import { ScalingRoadmap } from '../../../../../../src/modules/roadmap/domain/entities/scaling-roadmap.aggregate.js';
import { Uuid } from '../../../../../../src/shared/kernel/domain/value-objects/uuid.vo.js';
import { aDimensionCatalog } from '../../../../support/dimension-catalog.js';
import type { PhaseServiceAdvisorPort } from '../../../../../../src/modules/roadmap/domain/repositories/phase-service-advisor.port.js';

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
            finalTargetLevel: 4,
            enables: ['FRL'],
            inclusionReason: 'BELOW_EXPECTED_MINIMUM',
            expectedMinimum: 4,
            targetReason: 'EXPECTED_MINIMUM',
            targetDrivenBy: null,
          },
          {
            dimensionCode: 'IPRL',
            currentLevel: 1,
            targetLevel: 4,
            finalTargetLevel: 4,
            enables: ['FRL'],
            inclusionReason: 'BELOW_EXPECTED_MINIMUM',
            expectedMinimum: 3,
            targetReason: 'ENABLES',
            targetDrivenBy: 'FRL',
          },
        ],
        service: {
          idService: 2,
          name: 'Reto Express',
          tierOrder: 1,
          approximate: false,
        },
        serviceTrace: {
          mode: 'PHASE',
          projectedLevels: { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 },
          averageLevel: 3.5,
          excluded: [],
          skipped: [],
          ranking: [],
          appliedAdjustments: [],
        },
      },
      {
        order: 2,
        dimensions: [
          {
            dimensionCode: 'FRL',
            currentLevel: 2,
            targetLevel: 4,
            finalTargetLevel: 4,
            enables: [],
            inclusionReason: 'REQUIRED_ENABLER',
            expectedMinimum: 2,
            targetReason: 'EXPECTED_MINIMUM',
            targetDrivenBy: null,
          },
        ],
        service: null,
        serviceTrace: {
          mode: 'PHASE',
          projectedLevels: { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 },
          averageLevel: 3.5,
          excluded: [],
          skipped: [],
          ranking: [],
          appliedAdjustments: [],
        },
      },
    ],
    finalLevels: { TRL: 6, CRL: 4, BRL: 4, IPRL: 4, TmRL: 5, FRL: 4 },
    balanced: false,
  });
}

describe('GetScalingRoadmapUseCase', () => {
  let findByDiagnosticId: jest.Mock<
    RoadmapRepositoryPort['findByDiagnosticId']
  >;
  let useCase: GetScalingRoadmapUseCase;

  beforeEach(() => {
    findByDiagnosticId = jest.fn();
    useCase = new GetScalingRoadmapUseCase(
      {
        findByDiagnosticId,
        save: jest.fn(),
      } as unknown as RoadmapRepositoryPort,
      {
        findAllDimensions: () => Promise.resolve(aDimensionCatalog()),
      } as unknown as TaxonomyRepositoryPort,
      { verify: () => Promise.resolve(Result.ok(undefined)) },
      {
        advise: jest.fn(),
        describe: (ids: readonly number[]) =>
          Promise.resolve(
            new Map(
              ids.map((id) => [
                id,
                {
                  idService: id,
                  name: 'Reto Express (catálogo)',
                  subtitle: 'Hackatón · Design Sprint · Challenge',
                  description: 'Un reto intensivo.',
                  scope: 'Banco de ideas y prototipos tempranos.',
                  band: { minLevel: 3, maxLevel: 5 },
                  tier: {
                    code: 'descubre',
                    name: 'Descubre',
                    order: 1,
                    tagline: 'Conócenos jugando',
                    description:
                      'Formatos cortos y de baja inversión para encender la relación.',
                  },
                },
              ]),
            ),
          ),
      } as unknown as PhaseServiceAdvisorPort,
    );
  });

  // The roadmap names its dimensions from the catalog, so the
  // frontend keeps no name map.
  it('names every dimension of the saved roadmap from the catalog', async () => {
    findByDiagnosticId.mockResolvedValueOnce(aRoadmap());

    const result = await useCase.execute({
      diagnosticId: DIAGNOSTIC_ID,
      userId: 'user-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    const dto = result.value;

    expect(() => roadmapResponseSchema.parse(dto)).not.toThrow();
    expect(dto.generatedAt).toBe('2026-01-01T00:00:00.000Z');
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

  // The response says why a dimension is in the plan and what
  // sets its target, with the driving dimension named from the catalog.
  it('explains the inclusion and the target of each dimension', async () => {
    findByDiagnosticId.mockResolvedValueOnce(aRoadmap());

    const result = await useCase.execute({
      diagnosticId: DIAGNOSTIC_ID,
      userId: 'user-1',
    });

    if (!result.ok) throw new Error('expected ok result');
    const [brl, iprl] = result.value.phases[0].dimensions;
    const frl = result.value.phases[1].dimensions[0];

    expect(brl).toMatchObject({
      inclusionReason: 'BELOW_EXPECTED_MINIMUM',
      expectedMinimum: 4,
      targetDrivenBy: null,
    });
    expect(iprl.targetDrivenBy).toEqual({
      code: 'FRL',
      name: 'Nombre completo FRL',
      shortName: 'Corto FRL',
    });
    expect(frl.inclusionReason).toBe('REQUIRED_ENABLER');
  });

  it('gives each phase its service with the catalog card, under the name it was calculated with', async () => {
    findByDiagnosticId.mockResolvedValueOnce(aRoadmap());

    const result = await useCase.execute({
      diagnosticId: DIAGNOSTIC_ID,
      userId: 'user-1',
    });

    if (!result.ok) throw new Error('expected ok result');
    expect(result.value.phases[0].service).toMatchObject({
      idService: 2,
      name: 'Reto Express',
      subtitle: 'Hackatón · Design Sprint · Challenge',
      scope: 'Banco de ideas y prototipos tempranos.',
      band: { minLevel: 3, maxLevel: 5 },
      tier: { name: 'Descubre', order: 1 },
      approximate: false,
    });
    expect(result.value.phases[1].service).toBeNull();
    expect(result.value.finalLevels).toMatchObject({ IPRL: 4 });
    expect(result.value.balanced).toBe(false);
  });

  it('returns ROADMAP_NOT_GENERATED when nothing was saved', async () => {
    findByDiagnosticId.mockResolvedValueOnce(null);

    const result = await useCase.execute({
      diagnosticId: DIAGNOSTIC_ID,
      userId: 'user-1',
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(RoadmapNotGeneratedError);
    expect(result.error.code).toBe('ROADMAP_NOT_GENERATED');
  });
});
