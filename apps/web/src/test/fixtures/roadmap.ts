import type {
  DimensionCode,
  PhaseServiceTrace,
  RoadmapDimensionTarget,
  RoadmapPhase,
  RoadmapResponse,
} from '@innlab/contracts';
import { dimensionRefFixture } from './dimensions';
import { serviceDetailFixture } from './services';

type Target = Pick<RoadmapDimensionTarget, 'currentLevel' | 'targetLevel'> &
  Partial<
    Pick<
      RoadmapDimensionTarget,
      | 'inclusionReason'
      | 'expectedMinimum'
      | 'targetReason'
      | 'finalTargetLevel'
      | 'targetDrivenBy'
      | 'shortName'
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
    finalTargetLevel: over.finalTargetLevel ?? over.targetLevel,
    enables: (over.enables ?? []).map(dimensionRefFixture),
    inclusionReason: over.inclusionReason ?? 'BELOW_EXPECTED_MINIMUM',
    expectedMinimum: over.expectedMinimum ?? 4,
    targetReason: over.targetReason ?? 'EXPECTED_MINIMUM',
    targetDrivenBy: over.targetDrivenBy ?? null,
  };
}

/** How a phase's service was chosen (test-only, minimal). */
export function phaseTraceFixture(over: Partial<PhaseServiceTrace> = {}): PhaseServiceTrace {
  return {
    mode: 'PHASE',
    projectedLevels: { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 },
    averageLevel: 3.5,
    excluded: [],
    skipped: [],
    ranking: [],
    appliedAdjustments: [],
    ...over,
  };
}

function phase(
  order: number,
  dimensions: RoadmapDimensionTarget[],
  service: RoadmapPhase['service'],
  trace: PhaseServiceTrace,
): RoadmapPhase {
  return { order, dimensions, service, serviceTrace: trace };
}

const TRL = dimensionRefFixture('TRL');

/**
 * The AgroConecta case, balanced and paced at two levels per phase:
 * Cliente and Propiedad Intelectual first, then Negocio and the rest of
 * Propiedad Intelectual, then Financiación; one service per phase.
 */
export function agroconectaRoadmapFixture(): RoadmapResponse {
  return {
    diagnosticId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    generatedAt: '2026-09-08T10:00:00.000Z',
    phases: [
      phase(
        1,
        [
          roadmapDimensionFixture('CRL', {
            currentLevel: 4,
            targetLevel: 5,
            enables: ['BRL', 'FRL'],
            inclusionReason: 'BALANCE',
            targetReason: 'BALANCE',
            targetDrivenBy: TRL,
          }),
          roadmapDimensionFixture('IPRL', {
            currentLevel: 1,
            targetLevel: 3,
            finalTargetLevel: 5,
            enables: ['FRL'],
            targetReason: 'BALANCE',
            targetDrivenBy: TRL,
          }),
        ],
        { ...serviceDetailFixture(2, 'Reto Express'), approximate: false },
        phaseTraceFixture({ mode: 'RECOMMENDATION' }),
      ),
      phase(
        2,
        [
          roadmapDimensionFixture('BRL', {
            currentLevel: 3,
            targetLevel: 5,
            enables: ['FRL'],
            targetReason: 'BALANCE',
            targetDrivenBy: TRL,
          }),
          roadmapDimensionFixture('IPRL', {
            currentLevel: 3,
            targetLevel: 5,
            enables: ['FRL'],
            targetReason: 'BALANCE',
            targetDrivenBy: TRL,
          }),
        ],
        { ...serviceDetailFixture(4, 'Reto en el Aula'), approximate: false },
        phaseTraceFixture({
          projectedLevels: { TRL: 6, CRL: 5, BRL: 3, IPRL: 3, TmRL: 5, FRL: 2 },
          skipped: [{ name: 'Reto Express', reason: 'ALREADY_IN_ROUTE' }],
          ranking: [
            {
              position: 1,
              idService: 4,
              name: 'Reto en el Aula',
              score: 2.3,
              tierOrder: 2,
              includedBy: null,
              coverage: [
                { dimension: 'BRL', sourceLabel: 'secondary', levels: 2 },
                { dimension: 'IPRL', sourceLabel: 'not_applicable', levels: 2 },
              ],
            },
          ],
        }),
      ),
      phase(
        3,
        [roadmapDimensionFixture('FRL', { currentLevel: 2, targetLevel: 4 })],
        { ...serviceDetailFixture(5, 'Semillero con Propósito'), approximate: true },
        phaseTraceFixture({
          ranking: [
            {
              position: 1,
              idService: 5,
              name: 'Semillero con Propósito',
              score: -1.2,
              tierOrder: 2,
              includedBy: null,
              coverage: [{ dimension: 'FRL', sourceLabel: 'not_applicable', levels: 2 }],
            },
          ],
        }),
      ),
    ],
    finalLevels: { TRL: 6, CRL: 5, BRL: 5, IPRL: 5, TmRL: 5, FRL: 4 },
    balanced: true,
    dimensionsWithoutIntervention: [dimensionRefFixture('TRL'), dimensionRefFixture('TmRL')],
  };
}
