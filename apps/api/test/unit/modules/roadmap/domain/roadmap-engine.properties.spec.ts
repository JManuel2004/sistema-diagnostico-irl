import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import { DIMENSION_CODES, type DimensionCode } from '@innlab/contracts';
import { DependencyGraph } from '../../../../../src/modules/roadmap/domain/value-objects/dependency-graph.vo.js';
import { RoadmapClosureService } from '../../../../../src/modules/roadmap/domain/services/roadmap-closure.service.js';
import { TopologicalLayeringService } from '../../../../../src/modules/roadmap/domain/services/topological-layering.service.js';
import { TargetLevelCalculatorService } from '../../../../../src/modules/roadmap/domain/services/target-level-calculator.service.js';

/**
 * Propiedades del motor sobre grafos y perfiles arbitrarios.
 *
 * Los DAG se generan por construcción y no por rechazo: se fija el orden
 * canónico de `DIMENSION_CODES` como orden topológico y solo se admiten
 * edges que van de un índice menor a uno mayor. Así cualquier
 * subconjunto de esas edges es acíclico y el generador no descarta
 * casos, que es lo que haría lento e irregular un `fc.pre()`.
 */
const closureService = new RoadmapClosureService();
const layeringService = new TopologicalLayeringService();
const targetService = new TargetLevelCalculatorService();

const ACYCLIC_PAIRS: [DimensionCode, DimensionCode][] = [];
for (let i = 0; i < DIMENSION_CODES.length; i += 1) {
  for (let j = i + 1; j < DIMENSION_CODES.length; j += 1) {
    ACYCLIC_PAIRS.push([DIMENSION_CODES[i], DIMENSION_CODES[j]]);
  }
}

const arbGraph = fc
  .tuple(
    fc.subarray(ACYCLIC_PAIRS),
    fc.array(fc.integer({ min: 1, max: 9 }), {
      minLength: ACYCLIC_PAIRS.length,
      maxLength: ACYCLIC_PAIRS.length,
    }),
    fc.array(fc.integer({ min: 1, max: 9 }), { minLength: 6, maxLength: 6 }),
  )
  .map(([pairs, reqs, mins]) =>
    DependencyGraph.create(
      pairs.map(([source, target], i) => ({
        source,
        target,
        minimumRequiredLevel: reqs[i % reqs.length],
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
      new Map<DimensionCode, number>(
        DIMENSION_CODES.map((d, i) => [d, ns[i]]),
      ),
  );

describe('Propiedades del motor de roadmap', () => {
  it('ninguna dimensión aparece en una layer anterior a la de un predecesor suyo', () => {
    // Es la propiedad que define un orden topológico correcto: si u
    // habilita a v y ambos se intervienen, u no puede ir después.
    fc.assert(
      fc.property(arbGraph, arbProfile, (graph, levels) => {
        const closure = closureService.compute(levels, graph);
        const layers = layeringService.layer(closure, graph);

        const layerOf = new Map<DimensionCode, number>();
        layers.forEach((layer, i) => layer.forEach((d) => layerOf.set(d, i)));

        for (const e of graph.allEdges()) {
          if (!closure.has(e.source) || !closure.has(e.target)) continue;
          expect(layerOf.get(e.source)!).toBeLessThan(layerOf.get(e.target)!);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('toda dimensión intervenida tiene una meta estrictamente mayor que su nivel', () => {
    // Si esto se violara, habría una fase sin nada que hacer, y sería
    // señal de que el cierre incorporó una dimensión que no lo requería.
    fc.assert(
      fc.property(arbGraph, arbProfile, (graph, levels) => {
        const closure = closureService.compute(levels, graph);
        const targets = targetService.compute(closure, graph);

        for (const d of closure) {
          expect(targets.get(d)!).toBeGreaterThan(levels.get(d)!);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('las layers son una partición exacta del conjunto a intervenir', () => {
    fc.assert(
      fc.property(arbGraph, arbProfile, (graph, levels) => {
        const closure = closureService.compute(levels, graph);
        const layers = layeringService.layer(closure, graph);
        const planas = layers.flat();

        expect(planas).toHaveLength(closure.size);
        expect(new Set(planas).size).toBe(closure.size);
        for (const d of planas) expect(closure.has(d)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it('el cierre contiene siempre al focus', () => {
    fc.assert(
      fc.property(arbGraph, arbProfile, (graph, levels) => {
        const closure = closureService.compute(levels, graph);
        for (const d of DIMENSION_CODES) {
          if (levels.get(d)! < graph.expectedMinimum(d)) {
            expect(closure.has(d)).toBe(true);
          }
        }
      }),
      { numRuns: 300 },
    );
  });

  it('el motor es determinista', () => {
    fc.assert(
      fc.property(arbGraph, arbProfile, (graph, levels) => {
        const a = layeringService.layer(closureService.compute(levels, graph), graph);
        const b = layeringService.layer(closureService.compute(levels, graph), graph);
        expect(a).toEqual(b);
      }),
      { numRuns: 200 },
    );
  });
});
