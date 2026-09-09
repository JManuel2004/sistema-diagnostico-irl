import { describe, expect, it } from '@jest/globals';
import type { DimensionCode } from '@innlab/contracts';
import { DIMENSIONS } from '../../../../../src/infrastructure/database/seeds/data/dimensions.js';
import { DIMENSION_DEPENDENCIES } from '../../../../../src/infrastructure/database/seeds/data/dimension-dependencies.js';
import { DependencyGraph } from '../../../../../src/modules/scaling-roadmap/domain/value-objects/dependency-graph.vo.js';
import { RoadmapClosureService } from '../../../../../src/modules/scaling-roadmap/domain/services/roadmap-closure.service.js';
import { TopologicalLayeringService } from '../../../../../src/modules/scaling-roadmap/domain/services/topological-layering.service.js';
import { TargetLevelCalculatorService } from '../../../../../src/modules/scaling-roadmap/domain/services/target-level-calculator.service.js';

/**
 * Prueba de aceptación del roadmap de escalamiento — caso AgroConecta.
 *
 * Corre el motor contra **la configuración que siembra el seed**: importa
 * `dimensions.ts` y `dimension-dependencies.ts` directamente, de modo que
 * si alguien cambia una arista, un nivel requerido o un mínimo esperado,
 * esta prueba lo detecta. Un grafo literal propio del test la habría
 * convertido en una prueba de sí misma.
 *
 * Los valores esperados se derivaron a mano del grafo y del perfil, no
 * observando lo que produce el código:
 *
 *   perfil     TRL 6 · CRL 4 · BRL 3 · IPRL 1 · TmRL 5 · FRL 2
 *   mínimos    4 en las seis
 *
 *   foco       BRL (3<4) · IPRL (1<4) · FRL (2<4)
 *              CRL queda fuera: está justo en 4, no por debajo.
 *
 *   cierre     no entra ningún habilitador —
 *              a BRL la habilitan TmRL(req 3, tiene 5) y CRL(req 4, tiene 4)
 *              a IPRL la habilita  TRL (req 4, tiene 6)
 *              a FRL  la habilitan CRL(req 4, tiene 4), IPRL(req 4) y BRL(req 3)
 *              IPRL ya está dentro; los demás cumplen. Cierre = foco.
 *
 *   subgrafo   IPRL→FRL y BRL→FRL. Las demás aristas salen del conjunto.
 *   capa 0     BRL, IPRL  (grado de entrada 0, en paralelo)
 *   capa 1     FRL        (dependía de las dos anteriores)
 *
 *   metas      BRL: max(4, exige FRL 3) = 4  → 3→4
 *              IPRL:max(4, exige FRL 4) = 4  → 1→4
 *              FRL: max(4, sin sucesores) = 4 → 2→4
 */

const PERFIL_AGROCONECTA: ReadonlyMap<DimensionCode, number> = new Map([
  ['TRL', 6],
  ['CRL', 4],
  ['BRL', 3],
  ['IPRL', 1],
  ['TmRL', 5],
  ['FRL', 2],
]);

function construirGrafoDelSeed(): DependencyGraph {
  return DependencyGraph.create(
    DIMENSION_DEPENDENCIES.map((a) => ({
      origen: a.origen as DimensionCode,
      destino: a.destino as DimensionCode,
      nivelMinimoRequerido: a.nivelMinimoRequerido,
    })),
    DIMENSIONS.map((d) => ({
      dimension: d.codigo,
      nivelMinimoEsperado: d.nivelMinimoEsperado,
    })),
  );
}

function evaluar(niveles: ReadonlyMap<DimensionCode, number>) {
  const grafo = construirGrafoDelSeed();
  const cerradura = new RoadmapClosureService().compute(niveles, grafo);
  const capas = new TopologicalLayeringService().layer(cerradura, grafo);
  const metas = new TargetLevelCalculatorService().compute(cerradura, grafo);
  return { grafo, cerradura, capas, metas };
}

describe('Aceptación — roadmap de escalamiento para AgroConecta', () => {
  describe('conjunto a intervenir', () => {
    it('es exactamente {BRL, IPRL, FRL}', () => {
      const { cerradura } = evaluar(PERFIL_AGROCONECTA);

      expect([...cerradura].sort()).toEqual(['BRL', 'FRL', 'IPRL']);
    });

    it('excluye TRL, CRL y TmRL del roadmap', () => {
      // Tecnología y Equipo superan su mínimo; Cliente está justo en 4,
      // que es cumplir, no incumplir. Ninguna necesita intervención.
      const { cerradura } = evaluar(PERFIL_AGROCONECTA);

      expect(cerradura.has('TRL')).toBe(false);
      expect(cerradura.has('CRL')).toBe(false);
      expect(cerradura.has('TmRL')).toBe(false);
    });

    it('no incorpora ningún habilitador: todos cumplen lo que sus aristas exigen', () => {
      const { cerradura } = evaluar(PERFIL_AGROCONECTA);
      const foco = ['BRL', 'IPRL', 'FRL'];

      expect(cerradura.size).toBe(foco.length);
    });
  });

  describe('orden de fases', () => {
    it('produce dos capas', () => {
      const { capas } = evaluar(PERFIL_AGROCONECTA);
      expect(capas).toHaveLength(2);
    });

    it('capa 0 lleva BRL e IPRL en paralelo', () => {
      // Ninguna depende de la otra dentro del conjunto, así que se
      // trabajan a la vez. El orden es el canónico del marco y existe
      // solo para que el resultado sea determinista.
      const { capas } = evaluar(PERFIL_AGROCONECTA);
      expect(capas[0]).toEqual(['BRL', 'IPRL']);
    });

    it('capa 1 lleva FRL, que dependía de las dos anteriores', () => {
      const { capas } = evaluar(PERFIL_AGROCONECTA);
      expect(capas[1]).toEqual(['FRL']);
    });
  });

  describe('metas por dimensión', () => {
    it('lleva BRL de 3 a 4, IPRL de 1 a 4 y FRL de 2 a 4', () => {
      const { metas } = evaluar(PERFIL_AGROCONECTA);

      expect(metas.get('BRL')).toBe(4);
      expect(metas.get('IPRL')).toBe(4);
      expect(metas.get('FRL')).toBe(4);
    });

    it('toda meta supera el nivel actual', () => {
      const { cerradura, metas } = evaluar(PERFIL_AGROCONECTA);

      for (const d of cerradura) {
        expect(metas.get(d)!).toBeGreaterThan(PERFIL_AGROCONECTA.get(d)!);
      }
    });
  });

  describe('justificación de dependencias', () => {
    it('BRL e IPRL habilitan FRL; FRL no habilita a nadie del conjunto', () => {
      const { grafo, cerradura } = evaluar(PERFIL_AGROCONECTA);
      const habilita = (d: DimensionCode) =>
        grafo
          .outgoingEdges(d)
          .filter((e) => cerradura.has(e.destino))
          .map((e) => e.destino);

      expect(habilita('BRL')).toEqual(['FRL']);
      expect(habilita('IPRL')).toEqual(['FRL']);
      expect(habilita('FRL')).toEqual([]);
    });
  });

  describe('sensibilidad del caso', () => {
    it('si CRL bajara a 3 entraría al roadmap y arrastraría el orden', () => {
      // Contraprueba de que CRL queda fuera por estar exactamente en su
      // mínimo, no porque el motor la ignore.
      const conCrlBajo = new Map(PERFIL_AGROCONECTA).set('CRL', 3);
      const { cerradura, capas } = evaluar(conCrlBajo);

      expect(cerradura.has('CRL')).toBe(true);
      // CRL habilita a BRL y a FRL, así que precede a ambas.
      expect(capas[0]).toContain('CRL');
      expect(capas[0]).not.toContain('BRL');
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
      const { cerradura, capas } = evaluar(sano);

      expect(cerradura.size).toBe(0);
      expect(capas).toEqual([]);
    });
  });
});
