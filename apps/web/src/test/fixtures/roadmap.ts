import type { DimensionCode, RoadmapDimensionTarget, RoadmapResponse } from '@innlab/contracts';
import { dimensionRefFixture } from './dimensions';

type Target = Pick<RoadmapDimensionTarget, 'currentLevel' | 'targetLevel'> &
  Partial<
    Pick<
      RoadmapDimensionTarget,
      'inclusionReason' | 'expectedMinimum' | 'targetDrivenBy' | 'shortName'
    >
  > & { enables?: DimensionCode[] };

/** A dimension of a roadmap, named the way the backend names it. */
export function roadmapDimensionFixture(code: DimensionCode, over: Target): RoadmapDimensionTarget {
  const { name, shortName } = dimensionRefFixture(code);
  return {
    dimensionCode: code,
    name,
    shortName: over.shortName ?? shortName,
    currentLevel: over.currentLevel,
    targetLevel: over.targetLevel,
    enables: (over.enables ?? []).map(dimensionRefFixture),
    inclusionReason: over.inclusionReason ?? 'BELOW_EXPECTED_MINIMUM',
    expectedMinimum: over.expectedMinimum ?? 4,
    targetDrivenBy: over.targetDrivenBy ?? null,
  };
}

/** The AgroConecta case: BRL and IPRL in parallel, then FRL. */
export function agroconectaRoadmapFixture(): RoadmapResponse {
  return {
    diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    generatedAt: '2026-09-08T10:00:00.000Z',
    phases: [
      {
        order: 1,
        dimensions: [
          roadmapDimensionFixture('BRL', { currentLevel: 3, targetLevel: 4, enables: ['FRL'] }),
          roadmapDimensionFixture('IPRL', { currentLevel: 1, targetLevel: 4, enables: ['FRL'] }),
        ],
      },
      {
        order: 2,
        dimensions: [roadmapDimensionFixture('FRL', { currentLevel: 2, targetLevel: 4 })],
      },
    ],
    dimensionsWithoutIntervention: [
      dimensionRefFixture('TRL'),
      dimensionRefFixture('CRL'),
      dimensionRefFixture('TmRL'),
    ],
  };
}
