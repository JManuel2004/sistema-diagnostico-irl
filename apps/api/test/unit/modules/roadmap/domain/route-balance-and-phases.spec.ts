import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import {
  DIMENSION_CODES,
  IMBALANCE_PAIRS,
  type DimensionCode,
} from '@innlab/contracts';
import { DependencyGraph } from '../../../../../src/modules/roadmap/domain/value-objects/dependency-graph.vo.js';
import { RoadmapClosureService } from '../../../../../src/modules/roadmap/domain/services/roadmap-closure.service.js';
import { TopologicalLayeringService } from '../../../../../src/modules/roadmap/domain/services/topological-layering.service.js';
import { TargetLevelCalculatorService } from '../../../../../src/modules/roadmap/domain/services/target-level-calculator.service.js';
import { RoadmapBalancingService } from '../../../../../src/modules/roadmap/domain/services/roadmap-balancing.service.js';
import { PhasePlannerService } from '../../../../../src/modules/roadmap/domain/services/phase-planner.service.js';
import { DIMENSIONS } from '../../../../../src/shared/kernel/infrastructure/database/seeds/data/dimensions.js';
import { DIMENSION_DEPENDENCIES } from '../../../../../src/shared/kernel/infrastructure/database/seeds/data/dimension-dependencies.js';

/**
 * The route that ends balanced, paced by phases (`RoadmapBalancingService`
 * + `PhasePlannerService`): the AgroConecta case on the seeded graph, and
 * properties over arbitrary acyclic graphs and profiles.
 */
const closure = new RoadmapClosureService();
const targets = new TargetLevelCalculatorService();
const balancing = new RoadmapBalancingService();
const planner = new PhasePlannerService();
const layering = new TopologicalLayeringService();

const SEEDED_GRAPH = DependencyGraph.create(
  DIMENSION_DEPENDENCIES.map((e) => ({
    source: e.source as DimensionCode,
    target: e.target as DimensionCode,
    minimumRequiredLevel: e.minimumRequiredLevel,
  })),
  DIMENSIONS.map((d) => ({
    dimension: d.code,
    minimumExpectedLevel: d.minimumExpectedLevel,
  })),
);

const levelsOf = (r: Record<DimensionCode, number>) =>
  new Map<DimensionCode, number>(DIMENSION_CODES.map((d) => [d, r[d]]));

function route(
  levels: ReadonlyMap<DimensionCode, number>,
  graph: DependencyGraph,
  tolerance: number,
  step: number,
) {
  const dependencyTargets = targets.compute(
    closure.compute(levels, graph),
    graph,
  );
  const final = balancing.balance(levels, dependencyTargets, graph, tolerance);
  const finalTargets = new Map(
    [...final].map(([d, t]) => [d, t.target] as const),
  );
  return {
    final,
    finalTargets,
    phases: planner.plan(levels, finalTargets, graph, step),
  };
}

describe('Route — AgroConecta on the seeded graph', () => {
  const AGRO = levelsOf({ TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 });

  it('without balancing it is the roadmap of the minimums: two phases', () => {
    const { phases } = route(AGRO, SEEDED_GRAPH, 8, 8);

    expect(
      phases.map((p) =>
        p.map((s) => `${s.dimension} ${s.fromLevel}→${s.toLevel}`),
      ),
    ).toEqual([['BRL 3→4', 'IPRL 1→4'], ['FRL 2→4']]);
  });

  it('balanced (no imbalance with an alert), Cliente joins and the targets rise to keep up with Tecnología', () => {
    const { final } = route(AGRO, SEEDED_GRAPH, 1, 8);

    expect(
      Object.fromEntries([...final].map(([d, t]) => [d, t.target])),
    ).toEqual({
      CRL: 5,
      BRL: 5,
      IPRL: 5,
      FRL: 4,
    });
    expect(final.get('CRL')).toMatchObject({
      inclusionReason: 'BALANCE',
      targetReason: 'BALANCE',
      targetDrivenBy: 'TRL',
    });
    expect(final.get('BRL')).toMatchObject({
      inclusionReason: 'BELOW_EXPECTED_MINIMUM',
      targetReason: 'BALANCE',
      targetDrivenBy: 'TRL',
    });
    expect(final.get('FRL')).toMatchObject({
      inclusionReason: 'BELOW_EXPECTED_MINIMUM',
      targetReason: 'EXPECTED_MINIMUM',
      targetDrivenBy: null,
    });
  });

  it('at most two levels per phase: Propiedad Intelectual 1→5 spans two phases', () => {
    const { phases } = route(AGRO, SEEDED_GRAPH, 1, 2);

    expect(
      phases.map((p) =>
        p.map((s) => `${s.dimension} ${s.fromLevel}→${s.toLevel}`),
      ),
    ).toEqual([['CRL 4→5', 'IPRL 1→3'], ['BRL 3→5', 'IPRL 3→5'], ['FRL 2→4']]);
  });
});

// ── Properties ────────────────────────────────────────────────────────────

const ACYCLIC_PAIRS: [DimensionCode, DimensionCode][] = [];
for (let i = 0; i < DIMENSION_CODES.length; i += 1) {
  for (let j = i + 1; j < DIMENSION_CODES.length; j += 1) {
    ACYCLIC_PAIRS.push([DIMENSION_CODES[i], DIMENSION_CODES[j]]);
  }
}
const arbGraph = fc
  .tuple(
    fc.subarray(ACYCLIC_PAIRS),
    fc.array(fc.integer({ min: 1, max: 9 }), { minLength: 15, maxLength: 15 }),
    fc.array(fc.integer({ min: 1, max: 9 }), { minLength: 6, maxLength: 6 }),
  )
  .map(([pairs, reqs, mins]) =>
    DependencyGraph.create(
      pairs.map(([source, target], i) => ({
        source,
        target,
        minimumRequiredLevel: reqs[i],
      })),
      DIMENSION_CODES.map((d, i) => ({
        dimension: d,
        minimumExpectedLevel: mins[i],
      })),
    ),
  );
const arbProfile = fc
  .array(fc.integer({ min: 1, max: 9 }), { minLength: 6, maxLength: 6 })
  .map(
    (ns) =>
      new Map<DimensionCode, number>(DIMENSION_CODES.map((d, i) => [d, ns[i]])),
  );

describe('Route — properties', () => {
  it('the balanced route never lowers a dimension and leaves no pair beyond the tolerance', () => {
    fc.assert(
      fc.property(
        arbGraph,
        arbProfile,
        fc.integer({ min: 0, max: 3 }),
        (graph, levels, tolerance) => {
          const { finalTargets } = route(levels, graph, tolerance, 8);
          const end = new Map(levels);
          for (const [d, t] of finalTargets) {
            expect(t).toBeGreaterThan(levels.get(d)!);
            end.set(d, t);
          }
          for (const [a, b] of IMBALANCE_PAIRS) {
            expect(Math.abs(end.get(a)! - end.get(b)!)).toBeLessThanOrEqual(
              tolerance,
            );
          }
          expect(RoadmapBalancingService.isBalanced(end, tolerance)).toBe(true);
        },
      ),
    );
  });

  it('every phase raises a dimension by at most the limit, and the route reaches every target', () => {
    fc.assert(
      fc.property(
        arbGraph,
        arbProfile,
        fc.integer({ min: 1, max: 4 }),
        (graph, levels, step) => {
          const { finalTargets, phases } = route(levels, graph, 1, step);
          const reached = new Map(levels);
          for (const phase of phases) {
            expect(new Set(phase.map((s) => s.dimension)).size).toBe(
              phase.length,
            );
            for (const s of phase) {
              expect(s.fromLevel).toBe(reached.get(s.dimension));
              expect(s.toLevel - s.fromLevel).toBeGreaterThan(0);
              expect(s.toLevel - s.fromLevel).toBeLessThanOrEqual(step);
              reached.set(s.dimension, s.toLevel);
            }
          }
          for (const [d, t] of finalTargets) expect(reached.get(d)).toBe(t);
        },
      ),
    );
  });

  it('without a limit per phase the phases are the topological layers of the roadmap', () => {
    fc.assert(
      fc.property(arbGraph, arbProfile, (graph, levels) => {
        const { finalTargets, phases } = route(levels, graph, 8, 8);
        const roadmap = new Set(finalTargets.keys());
        expect(phases.map((p) => p.map((s) => s.dimension))).toEqual(
          layering.layer(roadmap, graph),
        );
      }),
    );
  });
});
