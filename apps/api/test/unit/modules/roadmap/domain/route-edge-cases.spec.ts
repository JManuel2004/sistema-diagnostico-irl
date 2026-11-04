import { describe, expect, it } from '@jest/globals';
import { DIMENSION_CODES, type DimensionCode } from '@innlab/contracts';
import { DependencyGraph } from '../../../../../src/modules/roadmap/domain/value-objects/dependency-graph.vo.js';
import { PhasePlannerService } from '../../../../../src/modules/roadmap/domain/services/phase-planner.service.js';
import { RoadmapBalancingService } from '../../../../../src/modules/roadmap/domain/services/roadmap-balancing.service.js';
import {
  DependencyGraphCycleError,
  RoadmapCalculationError,
} from '../../../../../src/modules/roadmap/domain/exceptions/roadmap.errors.js';
import { ScalingRoadmap } from '../../../../../src/modules/roadmap/domain/entities/scaling-roadmap.aggregate.js';
import { Uuid } from '../../../../../src/shared/kernel/domain/value-objects/uuid.vo.js';

/**
 * The edges of the route's domain: profiles or targets that do not name
 * every dimension, a cycle that slipped past the graph's own check, a
 * target no rule explains, and a phase that overshoots its final target.
 * Each is a guard the happy paths of the other suites never reach.
 */
const MINIMUMS = DIMENSION_CODES.map((d) => ({
  dimension: d,
  minimumExpectedLevel: 4,
}));
const EMPTY_GRAPH = DependencyGraph.create([], MINIMUMS);
const all = (level: number) =>
  new Map<DimensionCode, number>(DIMENSION_CODES.map((d) => [d, level]));

describe('PhasePlannerService — bordes', () => {
  const planner = new PhasePlannerService();

  it('una dimensión que el perfil no trae parte del nivel 1, y una sin meta no entra en la ruta', () => {
    const levels = all(5);
    levels.delete('FRL');
    const targets = new Map<DimensionCode, number>([['FRL', 3]]);

    const phases = planner.plan(levels, targets, EMPTY_GRAPH, 9);

    expect(phases).toEqual([[{ dimension: 'FRL', fromLevel: 1, toLevel: 3 }]]);
  });

  it('un grafo con un ciclo que se coló detiene la planificación en vez de girar sin fin', () => {
    // DependencyGraph refuses cycles when it is built; a stub stands in for
    // one that did not, so the planner's own guard is what answers.
    const cyclic = {
      incomingEdges: (d: DimensionCode) =>
        d === 'TRL'
          ? [
              {
                source: 'CRL' as DimensionCode,
                target: 'TRL' as DimensionCode,
                minimumRequiredLevel: 5,
              },
            ]
          : d === 'CRL'
            ? [
                {
                  source: 'TRL' as DimensionCode,
                  target: 'CRL' as DimensionCode,
                  minimumRequiredLevel: 5,
                },
              ]
            : [],
    } as unknown as DependencyGraph;
    const targets = new Map<DimensionCode, number>([
      ['TRL', 6],
      ['CRL', 6],
    ]);

    expect(() => planner.plan(all(3), targets, cyclic, 2)).toThrow(
      DependencyGraphCycleError,
    );
  });
});

describe('RoadmapBalancingService — bordes', () => {
  const balancing = new RoadmapBalancingService();

  it('una meta que no explica ni un mínimo, ni una dependencia, ni un socio se lee como mínimo esperado', () => {
    // Everyone at 5 (over the minimum of 4); TRL's target of 7 comes from
    // outside the rules: no pair is left more than 3 apart and no edge asks it.
    const result = balancing.balance(
      all(5),
      new Map([['TRL', 7]]),
      EMPTY_GRAPH,
      3,
    );

    expect(result.get('TRL')).toEqual({
      target: 7,
      inclusionReason: 'BALANCE',
      targetReason: 'EXPECTED_MINIMUM',
      targetDrivenBy: null,
    });
    expect([...result.keys()]).toEqual(['TRL']);
  });

  it('un perfil que no trae una dimensión la toma en el nivel 1', () => {
    const levels = all(4);
    levels.delete('IPRL');

    const result = balancing.balance(levels, new Map(), EMPTY_GRAPH, 2);

    // At 1 with partners at 4 it is lifted to 2 to stay within tolerance.
    expect(result.get('IPRL')?.target).toBe(2);
  });

  it('un perfil final incompleto se evalúa con el nivel 1 en lo que falta', () => {
    const partial = new Map<DimensionCode, number>([['TRL', 5]]);

    expect(RoadmapBalancingService.isBalanced(partial, 3)).toBe(false);
    expect(RoadmapBalancingService.isBalanced(new Map(), 0)).toBe(true);
  });
});

describe('DependencyGraph — bordes', () => {
  it('una dimensión que el grafo no conoce no tiene aristas, ni de entrada ni de salida', () => {
    const unknown = 'XRL' as DimensionCode;

    expect(EMPTY_GRAPH.incomingEdges(unknown)).toEqual([]);
    expect(EMPTY_GRAPH.outgoingEdges(unknown)).toEqual([]);
  });
});

describe('ScalingRoadmap — bordes', () => {
  it('rechaza una fase que lleva una dimensión más allá de su meta final', () => {
    expect(() =>
      ScalingRoadmap.create({
        diagnosticId: Uuid.create('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
        phases: [
          {
            order: 1,
            dimensions: [
              {
                dimensionCode: 'FRL',
                currentLevel: 2,
                targetLevel: 5,
                finalTargetLevel: 4,
                enables: [],
                inclusionReason: 'BELOW_EXPECTED_MINIMUM',
                expectedMinimum: 4,
                targetReason: 'EXPECTED_MINIMUM',
                targetDrivenBy: null,
              },
            ],
            service: null,
            serviceTrace: {
              mode: 'PHASE',
              projectedLevels: {
                TRL: 6,
                CRL: 4,
                BRL: 4,
                IPRL: 4,
                TmRL: 5,
                FRL: 4,
              },
              averageLevel: 4.5,
              excluded: [],
              skipped: [],
              ranking: [],
              appliedAdjustments: [],
            },
          },
        ],
        finalLevels: { TRL: 6, CRL: 4, BRL: 4, IPRL: 4, TmRL: 5, FRL: 4 },
        balanced: false,
        generatedAt: new Date('2026-09-08T10:00:00.000Z'),
      }),
    ).toThrow(RoadmapCalculationError);
  });
});
