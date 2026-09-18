import { describe, expect, it } from '@jest/globals';
import type { DimensionCode } from '@innlab/contracts';
import { DependencyGraph } from '../../../../../src/modules/roadmap/domain/value-objects/dependency-graph.vo.js';
import {
  DependencyGraphCycleError,
  RoadmapCalculationError,
} from '../../../../../src/modules/roadmap/domain/exceptions/roadmap.errors.js';

const DIMS: DimensionCode[] = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'];

const minimosCompletos = (nivel = 4) =>
  DIMS.map((d) => ({ dimension: d, minimumExpectedLevel: nivel }));

const edge = (
  source: DimensionCode,
  target: DimensionCode,
  minimumRequiredLevel = 3,
) => ({ source, target, minimumRequiredLevel });

describe('DependencyGraph', () => {
  describe('construcción válida', () => {
    it('acepta un graph acíclico con mínimos completos', () => {
      const g = DependencyGraph.create(
        [edge('TmRL', 'TRL'), edge('TRL', 'CRL')],
        minimosCompletos(),
      );
      expect(g.expectedMinimum('TRL')).toBe(4);
      expect(g.nodes()).toHaveLength(6);
    });

    it('acepta un graph sin ninguna edge', () => {
      const g = DependencyGraph.create([], minimosCompletos());
      expect(g.allEdges()).toEqual([]);
      expect(g.incomingEdges('FRL')).toEqual([]);
    });

    it('indexa edges entrantes y salientes por dimensión', () => {
      const g = DependencyGraph.create(
        [edge('BRL', 'FRL', 3), edge('IPRL', 'FRL', 4)],
        minimosCompletos(),
      );
      expect(g.incomingEdges('FRL')).toHaveLength(2);
      expect(g.outgoingEdges('BRL')).toHaveLength(1);
      expect(g.outgoingEdges('FRL')).toEqual([]);
    });

    it('admite mínimos distintos por dimensión', () => {
      // El esquema no asume un mínimo global; que el seed use 4 uniforme
      // es una decisión de datos, no una restricción del motor.
      const g = DependencyGraph.create(
        [],
        [
          { dimension: 'TRL', minimumExpectedLevel: 6 },
          ...DIMS.filter((d) => d !== 'TRL').map((d) => ({
            dimension: d,
            minimumExpectedLevel: 3,
          })),
        ],
      );
      expect(g.expectedMinimum('TRL')).toBe(6);
      expect(g.expectedMinimum('FRL')).toBe(3);
    });
  });

  describe('rechazo de configuración inválida', () => {
    it('rechaza una edge reflexiva', () => {
      expect(() =>
        DependencyGraph.create([edge('TRL', 'TRL')], minimosCompletos()),
      ).toThrow(/reflexiva/);
    });

    it('rechaza una edge duplicada', () => {
      expect(() =>
        DependencyGraph.create(
          [edge('TRL', 'CRL', 3), edge('TRL', 'CRL', 4)],
          minimosCompletos(),
        ),
      ).toThrow(/duplicada/);
    });

    it('acepta A→B y B→A como edges distintas, pero las detecta como ciclo', () => {
      // No son duplicadas: son direcciones opuestas. Lo que las descarta
      // es la aciclicidad, no la unicidad del par.
      expect(() =>
        DependencyGraph.create(
          [edge('TRL', 'CRL'), edge('CRL', 'TRL')],
          minimosCompletos(),
        ),
      ).toThrow(DependencyGraphCycleError);
    });

    it('rechaza un nivel requerido fuera de [1,9]', () => {
      expect(() =>
        DependencyGraph.create([edge('TRL', 'CRL', 10)], minimosCompletos()),
      ).toThrow(/\[1, 9\]/);
      expect(() =>
        DependencyGraph.create([edge('TRL', 'CRL', 0)], minimosCompletos()),
      ).toThrow(/\[1, 9\]/);
    });

    it('rechaza un mínimo esperado fuera de [1,9]', () => {
      expect(() =>
        DependencyGraph.create(
          [],
          DIMS.map((d) => ({
            dimension: d,
            minimumExpectedLevel: d === 'FRL' ? 12 : 4,
          })),
        ),
      ).toThrow(/\[1, 9\]/);
    });

    it('rechaza que falte el mínimo de alguna dimensión, y la nombra', () => {
      expect(() =>
        DependencyGraph.create(
          [],
          DIMS.filter((d) => d !== 'IPRL').map((d) => ({
            dimension: d,
            minimumExpectedLevel: 4,
          })),
        ),
      ).toThrow(/IPRL/);
    });

    it('rechaza un mínimo declarado dos veces para la misma dimensión', () => {
      expect(() =>
        DependencyGraph.create(
          [],
          [...minimosCompletos(), { dimension: 'TRL', minimumExpectedLevel: 5 }],
        ),
      ).toThrow(/duplicado/);
    });
  });

  describe('detección de ciclos', () => {
    it('detecta un ciclo de tres nodos y nombra las dimensions implicadas', () => {
      // La base de datos no puede ver esto: UNIQUE(source, target)
      // impide duplicados, no que el recorrido se cierre sobre sí mismo.
      let capturado: DependencyGraphCycleError | undefined;
      try {
        DependencyGraph.create(
          [
            edge('TRL', 'CRL'),
            edge('CRL', 'BRL'),
            edge('BRL', 'TRL'),
          ],
          minimosCompletos(),
        );
      } catch (e) {
        capturado = e as DependencyGraphCycleError;
      }

      expect(capturado).toBeInstanceOf(DependencyGraphCycleError);
      expect(capturado!.code).toBe('ROADMAP_GRAPH_HAS_CYCLE');
      expect(capturado!.dimensionesImplicadas).toEqual(
        expect.arrayContaining(['TRL', 'CRL', 'BRL']),
      );
      expect(capturado!.message).toMatch(/ciclo/);
    });

    it('detecta un ciclo de dos nodos', () => {
      expect(() =>
        DependencyGraph.create(
          [edge('IPRL', 'FRL'), edge('FRL', 'IPRL')],
          minimosCompletos(),
        ),
      ).toThrow(DependencyGraphCycleError);
    });

    it('un ciclo es un RoadmapCalculationError, y por tanto un 500', () => {
      // Un graph mal declarado es un defecto de configuración del
      // sistema, no un error de la petición del usuario.
      const error = new DependencyGraphCycleError(['TRL', 'CRL']);
      expect(error).toBeInstanceOf(RoadmapCalculationError);
    });

    it('no confunde un rombo con un ciclo', () => {
      // A→B, A→C, B→D, C→D es un DAG perfectamente válido.
      expect(() =>
        DependencyGraph.create(
          [
            edge('TmRL', 'TRL'),
            edge('TmRL', 'CRL'),
            edge('TRL', 'FRL'),
            edge('CRL', 'FRL'),
          ],
          minimosCompletos(),
        ),
      ).not.toThrow();
    });
  });
});

describe('DependencyGraph — accesos defensivos', () => {
  it('el símbolo del puerto identifica la dependencia, no el nombre de clase', async () => {
    const { DEPENDENCY_GRAPH_REPOSITORY } = await import(
      '../../../../../src/modules/roadmap/domain/repositories/dependency-graph.repository.port.js'
    );
    expect(typeof DEPENDENCY_GRAPH_REPOSITORY).toBe('symbol');
  });

  it('`expectedMinimum` lanza ante una dimensión sin mínimo declarado', () => {
    // Inalcanzable por la vía normal —`create()` exige las seis— pero la
    // guarda existe para que una regresión falle en voz alta en vez de
    // devolver `undefined` y propagar un NaN por todo el cálculo.
    const g = DependencyGraph.create([], minimosCompletos());
    expect(() => g.expectedMinimum('INVENTADA' as DimensionCode)).toThrow(
      /no tiene nivel mínimo esperado/,
    );
  });
});
