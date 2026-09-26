import { describe, expect, it } from '@jest/globals';
import type { DimensionCode } from '@innlab/contracts';
import { DIMENSIONS } from '../../../../../src/shared/kernel/infrastructure/database/seeds/data/dimensions.js';
import { DIMENSION_DEPENDENCIES } from '../../../../../src/shared/kernel/infrastructure/database/seeds/data/dimension-dependencies.js';
import { DependencyGraph } from '../../../../../src/modules/roadmap/domain/value-objects/dependency-graph.vo.js';
import { RoadmapClosureService } from '../../../../../src/modules/roadmap/domain/services/roadmap-closure.service.js';
import { TopologicalLayeringService } from '../../../../../src/modules/roadmap/domain/services/topological-layering.service.js';
import { TargetLevelCalculatorService } from '../../../../../src/modules/roadmap/domain/services/target-level-calculator.service.js';

/**
 * Acceptance test of the scaling roadmap — AgroConecta case.
 *
 * Runs the engine against **the configuration the seed plants**: it imports
 * `dimensions.ts` and `dimension-dependencies.ts` directly, so if someone
 * changes an edge, a required level or an expected minimum, this test
 * catches it. A graph literal of its own would have made it a test of
 * itself.
 *
 * The expected values were derived by hand from the graph and the profile,
 * not by observing what the code produces:
 *
 *   profile    TRL 6 · CRL 4 · BRL 3 · IPRL 1 · TmRL 5 · FRL 2
 *   minimums   4 in all six
 *
 *   focus      BRL (3<4) · IPRL (1<4) · FRL (2<4)
 *              CRL stays out: it is exactly at 4, not below.
 *
 *   closure    no enabler comes in —
 *              BRL is enabled by TmRL(req 3, has 5) and CRL(req 4, has 4)
 *              IPRL is enabled by TRL (req 4, has 6)
 *              FRL is enabled by CRL(req 4, has 4), IPRL(req 4) and BRL(req 3)
 *              IPRL is already in; the rest comply. Closure = focus.
 *
 *   subgraph   IPRL→FRL and BRL→FRL. The other edges leave the set.
 *   layer 0    BRL, IPRL  (in-degree 0, in parallel)
 *   layer 1    FRL        (depended on the previous two)
 *
 *   targets    BRL: max(4, FRL demands 3) = 4  → 3→4
 *              IPRL:max(4, FRL demands 4) = 4  → 1→4
 *              FRL: max(4, no successors) = 4  → 2→4
 */

const AGROCONECTA_PROFILE: ReadonlyMap<DimensionCode, number> = new Map([
  ['TRL', 6],
  ['CRL', 4],
  ['BRL', 3],
  ['IPRL', 1],
  ['TmRL', 5],
  ['FRL', 2],
]);

function buildGraphFromSeed(): DependencyGraph {
  return DependencyGraph.create(
    DIMENSION_DEPENDENCIES.map((a) => ({
      source: a.source as DimensionCode,
      target: a.target as DimensionCode,
      minimumRequiredLevel: a.minimumRequiredLevel,
    })),
    DIMENSIONS.map((d) => ({
      dimension: d.code,
      minimumExpectedLevel: d.minimumExpectedLevel,
    })),
  );
}

function evaluate(levels: ReadonlyMap<DimensionCode, number>) {
  const graph = buildGraphFromSeed();
  const closure = new RoadmapClosureService().compute(levels, graph);
  const layers = new TopologicalLayeringService().layer(closure, graph);
  const targets = new TargetLevelCalculatorService().compute(closure, graph);
  return { graph, closure, layers, targets };
}

describe('Aceptación — roadmap de escalamiento para AgroConecta', () => {
  describe('conjunto a intervenir', () => {
    it('es exactamente {BRL, IPRL, FRL}', () => {
      const { closure } = evaluate(AGROCONECTA_PROFILE);

      expect([...closure].sort()).toEqual(['BRL', 'FRL', 'IPRL']);
    });

    it('excluye TRL, CRL y TmRL del roadmap', () => {
      // TRL and TmRL exceed their minimum; CRL is exactly at 4,
      // which is meeting it, not missing it. None needs intervention.
      const { closure } = evaluate(AGROCONECTA_PROFILE);

      expect(closure.has('TRL')).toBe(false);
      expect(closure.has('CRL')).toBe(false);
      expect(closure.has('TmRL')).toBe(false);
    });

    it('no incorpora ningún habilitador: todos cumplen lo que sus edges exigen', () => {
      const { closure } = evaluate(AGROCONECTA_PROFILE);
      const focus = ['BRL', 'IPRL', 'FRL'];

      expect(closure.size).toBe(focus.length);
    });
  });

  describe('orden de fases', () => {
    it('produce dos layers', () => {
      const { layers } = evaluate(AGROCONECTA_PROFILE);
      expect(layers).toHaveLength(2);
    });

    it('capa 0 lleva BRL e IPRL en paralelo', () => {
      // Neither depends on the other within the set, so they are worked
      // on at the same time. The order is the framework's canonical one and
      // exists only so the result is deterministic.
      const { layers } = evaluate(AGROCONECTA_PROFILE);
      expect(layers[0]).toEqual(['BRL', 'IPRL']);
    });

    it('capa 1 lleva FRL, que dependía de las dos anteriores', () => {
      const { layers } = evaluate(AGROCONECTA_PROFILE);
      expect(layers[1]).toEqual(['FRL']);
    });
  });

  describe('targets por dimensión', () => {
    it('lleva BRL de 3 a 4, IPRL de 1 a 4 y FRL de 2 a 4', () => {
      const { targets } = evaluate(AGROCONECTA_PROFILE);

      expect(targets.get('BRL')).toBe(4);
      expect(targets.get('IPRL')).toBe(4);
      expect(targets.get('FRL')).toBe(4);
    });

    it('toda meta supera el nivel actual', () => {
      const { closure, targets } = evaluate(AGROCONECTA_PROFILE);

      for (const d of closure) {
        expect(targets.get(d)!).toBeGreaterThan(AGROCONECTA_PROFILE.get(d)!);
      }
    });
  });

  describe('justificación de dependencies', () => {
    it('BRL e IPRL habilitan FRL; FRL no habilita a nadie del conjunto', () => {
      const { graph, closure } = evaluate(AGROCONECTA_PROFILE);
      const enablesByDimension = (d: DimensionCode) =>
        graph
          .outgoingEdges(d)
          .filter((e) => closure.has(e.target))
          .map((e) => e.target);

      expect(enablesByDimension('BRL')).toEqual(['FRL']);
      expect(enablesByDimension('IPRL')).toEqual(['FRL']);
      expect(enablesByDimension('FRL')).toEqual([]);
    });
  });

  describe('sensibilidad del caso', () => {
    it('si CRL bajara a 3 entraría al roadmap y arrastraría el orden', () => {
      // Counter-check that CRL stays out because it is exactly at its
      // minimum, not because the engine ignores it.
      const withLowCrl = new Map(AGROCONECTA_PROFILE).set('CRL', 3);
      const { closure, layers } = evaluate(withLowCrl);

      expect(closure.has('CRL')).toBe(true);
      // CRL enables BRL and FRL, so it precedes both.
      expect(layers[0]).toContain('CRL');
      expect(layers[0]).not.toContain('BRL');
    });

    it('un perfil que cumple en las seis produce un roadmap vacío', () => {
      const healthy: ReadonlyMap<DimensionCode, number> = new Map([
        ['TRL', 5],
        ['CRL', 5],
        ['BRL', 5],
        ['IPRL', 5],
        ['TmRL', 5],
        ['FRL', 5],
      ]);
      const { closure, layers } = evaluate(healthy);

      expect(closure.size).toBe(0);
      expect(layers).toEqual([]);
    });
  });
});
