import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import { DIMENSION_CODES, type DimensionCode } from '@innlab/contracts';
import { DependencyGraph } from '../../../../../src/modules/scaling-roadmap/domain/value-objects/dependency-graph.vo.js';
import { RoadmapClosureService } from '../../../../../src/modules/scaling-roadmap/domain/services/roadmap-closure.service.js';
import { TopologicalLayeringService } from '../../../../../src/modules/scaling-roadmap/domain/services/topological-layering.service.js';
import { TargetLevelCalculatorService } from '../../../../../src/modules/scaling-roadmap/domain/services/target-level-calculator.service.js';

/**
 * Propiedades del motor sobre grafos y perfiles arbitrarios.
 *
 * Los DAG se generan por construcción y no por rechazo: se fija el orden
 * canónico de `DIMENSION_CODES` como orden topológico y solo se admiten
 * aristas que van de un índice menor a uno mayor. Así cualquier
 * subconjunto de esas aristas es acíclico y el generador no descarta
 * casos, que es lo que haría lento e irregular un `fc.pre()`.
 */
const closure = new RoadmapClosureService();
const layering = new TopologicalLayeringService();
const targets = new TargetLevelCalculatorService();

const PARES_ACICLICOS: [DimensionCode, DimensionCode][] = [];
for (let i = 0; i < DIMENSION_CODES.length; i += 1) {
  for (let j = i + 1; j < DIMENSION_CODES.length; j += 1) {
    PARES_ACICLICOS.push([DIMENSION_CODES[i], DIMENSION_CODES[j]]);
  }
}

const arbGrafo = fc
  .tuple(
    fc.subarray(PARES_ACICLICOS),
    fc.array(fc.integer({ min: 1, max: 9 }), {
      minLength: PARES_ACICLICOS.length,
      maxLength: PARES_ACICLICOS.length,
    }),
    fc.array(fc.integer({ min: 1, max: 9 }), { minLength: 6, maxLength: 6 }),
  )
  .map(([pares, reqs, mins]) =>
    DependencyGraph.create(
      pares.map(([origen, destino], i) => ({
        origen,
        destino,
        nivelMinimoRequerido: reqs[i % reqs.length],
      })),
      DIMENSION_CODES.map((d, i) => ({
        dimension: d,
        nivelMinimoEsperado: mins[i],
      })),
    ),
  );

const arbPerfil = fc
  .array(fc.integer({ min: 1, max: 9 }), { minLength: 6, maxLength: 6 })
  .map(
    (ns) =>
      new Map<DimensionCode, number>(
        DIMENSION_CODES.map((d, i) => [d, ns[i]]),
      ),
  );

describe('Propiedades del motor de roadmap', () => {
  it('ninguna dimensión aparece en una capa anterior a la de un predecesor suyo', () => {
    // Es la propiedad que define un orden topológico correcto: si u
    // habilita a v y ambos se intervienen, u no puede ir después.
    fc.assert(
      fc.property(arbGrafo, arbPerfil, (grafo, niveles) => {
        const cerradura = closure.compute(niveles, grafo);
        const capas = layering.layer(cerradura, grafo);

        const capaDe = new Map<DimensionCode, number>();
        capas.forEach((capa, i) => capa.forEach((d) => capaDe.set(d, i)));

        for (const e of grafo.allEdges()) {
          if (!cerradura.has(e.origen) || !cerradura.has(e.destino)) continue;
          expect(capaDe.get(e.origen)!).toBeLessThan(capaDe.get(e.destino)!);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('toda dimensión intervenida tiene una meta estrictamente mayor que su nivel', () => {
    // Si esto se violara, habría una fase sin nada que hacer, y sería
    // señal de que el cierre incorporó una dimensión que no lo requería.
    fc.assert(
      fc.property(arbGrafo, arbPerfil, (grafo, niveles) => {
        const cerradura = closure.compute(niveles, grafo);
        const metas = targets.compute(cerradura, grafo);

        for (const d of cerradura) {
          expect(metas.get(d)!).toBeGreaterThan(niveles.get(d)!);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('las capas son una partición exacta del conjunto a intervenir', () => {
    fc.assert(
      fc.property(arbGrafo, arbPerfil, (grafo, niveles) => {
        const cerradura = closure.compute(niveles, grafo);
        const capas = layering.layer(cerradura, grafo);
        const planas = capas.flat();

        expect(planas).toHaveLength(cerradura.size);
        expect(new Set(planas).size).toBe(cerradura.size);
        for (const d of planas) expect(cerradura.has(d)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it('el cierre contiene siempre al foco', () => {
    fc.assert(
      fc.property(arbGrafo, arbPerfil, (grafo, niveles) => {
        const cerradura = closure.compute(niveles, grafo);
        for (const d of DIMENSION_CODES) {
          if (niveles.get(d)! < grafo.expectedMinimum(d)) {
            expect(cerradura.has(d)).toBe(true);
          }
        }
      }),
      { numRuns: 300 },
    );
  });

  it('el motor es determinista', () => {
    fc.assert(
      fc.property(arbGrafo, arbPerfil, (grafo, niveles) => {
        const a = layering.layer(closure.compute(niveles, grafo), grafo);
        const b = layering.layer(closure.compute(niveles, grafo), grafo);
        expect(a).toEqual(b);
      }),
      { numRuns: 200 },
    );
  });
});
