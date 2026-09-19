import { describe, expect, it } from '@jest/globals';
import type { DimensionCode } from '@innlab/contracts';
import { DIMENSIONS } from '../../../../../src/shared/kernel/infrastructure/database/seeds/data/dimensions.js';
import { DIMENSION_DEPENDENCIES } from '../../../../../src/shared/kernel/infrastructure/database/seeds/data/dimension-dependencies.js';
import { DependencyGraph } from '../../../../../src/modules/roadmap/domain/value-objects/dependency-graph.vo.js';
import { RoadmapClosureService } from '../../../../../src/modules/roadmap/domain/services/roadmap-closure.service.js';
import { TopologicalLayeringService } from '../../../../../src/modules/roadmap/domain/services/topological-layering.service.js';
import { TargetLevelCalculatorService } from '../../../../../src/modules/roadmap/domain/services/target-level-calculator.service.js';

/**
 * Prueba de aceptación del roadmap de escalamiento — caso AgroConecta.
 *
 * Corre el motor contra **la configuración que siembra el seed**: importa
 * `dimensions.ts` y `dimension-dependencies.ts` directamente, de modo que
 * si alguien cambia una edge, un nivel requerido o un mínimo esperado,
 * esta prueba lo detecta. Un graph literal propio del test la habría
 * convertido en una prueba de sí misma.
 *
 * Los valores esperados se derivaron a mano del graph y del perfil, no
 * observando lo que produce el código:
 *
 *   perfil     TRL 6 · CRL 4 · BRL 3 · IPRL 1 · TmRL 5 · FRL 2
 *   mínimos    4 en las seis
 *
 *   focus       BRL (3<4) · IPRL (1<4) · FRL (2<4)
 *              CRL queda fuera: está justo en 4, no por debajo.
 *
 *   cierre     no entra ningún habilitador —
 *              a BRL la habilitan TmRL(req 3, tiene 5) y CRL(req 4, tiene 4)
 *              a IPRL la habilita  TRL (req 4, tiene 6)
 *              a FRL  la habilitan CRL(req 4, tiene 4), IPRL(req 4) y BRL(req 3)
 *              IPRL ya está dentro; los demás cumplen. Cierre = focus.
 *
 *   subgrafo   IPRL→FRL y BRL→FRL. Las demás edges salen del conjunto.
 *   capa 0     BRL, IPRL  (grado de entrada 0, en paralelo)
 *   capa 1     FRL        (dependía de las dos anteriores)
 *
 *   targets      BRL: max(4, exige FRL 3) = 4  → 3→4
 *              IPRL:max(4, exige FRL 4) = 4  → 1→4
 *              FRL: max(4, sin sucesores) = 4 → 2→4
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
      // Tecnología y Equipo superan su mínimo; Cliente está justo en 4,
      // que es cumplir, no incumplir. Ninguna necesita intervención.
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
      // Ninguna depende de la otra dentro del conjunto, así que se
      // trabajan a la vez. El orden es el canónico del marco y existe
      // solo para que el resultado sea determinista.
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
      const habilita = (d: DimensionCode) =>
        graph
          .outgoingEdges(d)
          .filter((e) => closure.has(e.target))
          .map((e) => e.target);

      expect(habilita('BRL')).toEqual(['FRL']);
      expect(habilita('IPRL')).toEqual(['FRL']);
      expect(habilita('FRL')).toEqual([]);
    });
  });

  describe('sensibilidad del caso', () => {
    it('si CRL bajara a 3 entraría al roadmap y arrastraría el orden', () => {
      // Contraprueba de que CRL queda fuera por estar exactamente en su
      // mínimo, no porque el motor la ignore.
      const conCrlBajo = new Map(AGROCONECTA_PROFILE).set('CRL', 3);
      const { closure, layers } = evaluate(conCrlBajo);

      expect(closure.has('CRL')).toBe(true);
      // CRL habilita a BRL y a FRL, así que precede a ambas.
      expect(layers[0]).toContain('CRL');
      expect(layers[0]).not.toContain('BRL');
    });

    it('un perfil que cumple en las seis produce un roadmap vacío', () => {
      const sano: ReadonlyMap<DimensionCode, number> = new Map([
        ['TRL', 5],
        ['CRL', 5],
        ['BRL', 5],
        ['IPRL', 5],
        ['TmRL', 5],
        ['FRL', 5],
      ]);
      const { closure, layers } = evaluate(sano);

      expect(closure.size).toBe(0);
      expect(layers).toEqual([]);
    });
  });
});
