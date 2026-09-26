import { describe, expect, it } from '@jest/globals';
import type { DimensionCode } from '@innlab/contracts';
import { DependencyGraph } from '../../../../../src/modules/roadmap/domain/value-objects/dependency-graph.vo.js';
import {
  DependencyGraphCycleError,
  RoadmapCalculationError,
} from '../../../../../src/modules/roadmap/domain/exceptions/roadmap.errors.js';

const DIMS: DimensionCode[] = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'];

const completeMinimums = (level = 4) =>
  DIMS.map((d) => ({ dimension: d, minimumExpectedLevel: level }));

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
        completeMinimums(),
      );
      expect(g.expectedMinimum('TRL')).toBe(4);
      expect(g.nodes()).toHaveLength(6);
    });

    it('acepta un graph sin ninguna edge', () => {
      const g = DependencyGraph.create([], completeMinimums());
      expect(g.allEdges()).toEqual([]);
      expect(g.incomingEdges('FRL')).toEqual([]);
    });

    it('indexa edges entrantes y salientes por dimensión', () => {
      const g = DependencyGraph.create(
        [edge('BRL', 'FRL', 3), edge('IPRL', 'FRL', 4)],
        completeMinimums(),
      );
      expect(g.incomingEdges('FRL')).toHaveLength(2);
      expect(g.outgoingEdges('BRL')).toHaveLength(1);
      expect(g.outgoingEdges('FRL')).toEqual([]);
    });

    it('admite mínimos distintos por dimensión', () => {
      // The schema does not assume a global minimum; the seed using a uniform 4
      // is a data decision, not a constraint of the engine.
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
        DependencyGraph.create([edge('TRL', 'TRL')], completeMinimums()),
      ).toThrow(/reflexiva/);
    });

    it('rechaza una edge duplicada', () => {
      expect(() =>
        DependencyGraph.create(
          [edge('TRL', 'CRL', 3), edge('TRL', 'CRL', 4)],
          completeMinimums(),
        ),
      ).toThrow(/duplicada/);
    });

    it('acepta A→B y B→A como edges distintas, pero las detecta como ciclo', () => {
      // They are not duplicates: they are opposite directions. What rules them
      // out is acyclicity, not the uniqueness of the pair.
      expect(() =>
        DependencyGraph.create(
          [edge('TRL', 'CRL'), edge('CRL', 'TRL')],
          completeMinimums(),
        ),
      ).toThrow(DependencyGraphCycleError);
    });

    it('rechaza un nivel requerido fuera de [1,9]', () => {
      expect(() =>
        DependencyGraph.create([edge('TRL', 'CRL', 10)], completeMinimums()),
      ).toThrow(/\[1, 9\]/);
      expect(() =>
        DependencyGraph.create([edge('TRL', 'CRL', 0)], completeMinimums()),
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
          [...completeMinimums(), { dimension: 'TRL', minimumExpectedLevel: 5 }],
        ),
      ).toThrow(/duplicado/);
    });
  });

  describe('detección de ciclos', () => {
    it('detecta un ciclo de tres nodos y nombra las dimensions implicadas', () => {
      // The database cannot see this: UNIQUE(source, target) prevents
      // duplicates, not the walk closing on itself.
      let caught: DependencyGraphCycleError | undefined;
      try {
        DependencyGraph.create(
          [
            edge('TRL', 'CRL'),
            edge('CRL', 'BRL'),
            edge('BRL', 'TRL'),
          ],
          completeMinimums(),
        );
      } catch (e) {
        caught = e as DependencyGraphCycleError;
      }

      expect(caught).toBeInstanceOf(DependencyGraphCycleError);
      expect(caught!.code).toBe('ROADMAP_GRAPH_HAS_CYCLE');
      expect(caught!.involvedDimensions).toEqual(
        expect.arrayContaining(['TRL', 'CRL', 'BRL']),
      );
      expect(caught!.message).toMatch(/ciclo/);
    });

    it('detecta un ciclo de dos nodos', () => {
      expect(() =>
        DependencyGraph.create(
          [edge('IPRL', 'FRL'), edge('FRL', 'IPRL')],
          completeMinimums(),
        ),
      ).toThrow(DependencyGraphCycleError);
    });

    it('un ciclo es un RoadmapCalculationError, y por tanto un 500', () => {
      // A badly declared graph is a configuration defect of the system,
      // not an error in the user's request.
      const error = new DependencyGraphCycleError(['TRL', 'CRL']);
      expect(error).toBeInstanceOf(RoadmapCalculationError);
    });

    it('no confunde un rombo con un ciclo', () => {
      // A→B, A→C, B→D, C→D is a perfectly valid DAG.
      expect(() =>
        DependencyGraph.create(
          [
            edge('TmRL', 'TRL'),
            edge('TmRL', 'CRL'),
            edge('TRL', 'FRL'),
            edge('CRL', 'FRL'),
          ],
          completeMinimums(),
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
    // Unreachable the normal way — `create()` demands all six — but the
    // guard exists so a regression fails loudly instead of returning
    // `undefined` and spreading a NaN through the whole calculation.
    const g = DependencyGraph.create([], completeMinimums());
    expect(() => g.expectedMinimum('INVENTADA' as DimensionCode)).toThrow(
      /no tiene nivel mínimo esperado/,
    );
  });
});
