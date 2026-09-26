import { describe, expect, it } from '@jest/globals';
import type { DimensionCode } from '@innlab/contracts';
import { DependencyGraph } from '../../../../../src/modules/roadmap/domain/value-objects/dependency-graph.vo.js';
import { RoadmapClosureService } from '../../../../../src/modules/roadmap/domain/services/roadmap-closure.service.js';

const DIMS: DimensionCode[] = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'];
const minimums = (n = 4) =>
  DIMS.map((d) => ({ dimension: d, minimumExpectedLevel: n }));
const e = (o: DimensionCode, d: DimensionCode, req: number) => ({
  source: o,
  target: d,
  minimumRequiredLevel: req,
});
const levels = (n: Partial<Record<DimensionCode, number>>) =>
  new Map<DimensionCode, number>(
    DIMS.map((d) => [d, n[d] ?? 9]),
  );

const service = new RoadmapClosureService();

describe('RoadmapClosureService', () => {
  it('el focus son las dimensions por debajo de su mínimo esperado', () => {
    const g = DependencyGraph.create([], minimums(4));
    const c = service.compute(levels({ BRL: 3, FRL: 2 }), g);
    expect([...c].sort()).toEqual(['BRL', 'FRL']);
  });

  it('una dimensión exactamente en su mínimo no entra al focus', () => {
    const g = DependencyGraph.create([], minimums(4));
    expect(service.compute(levels({ CRL: 4 }), g).size).toBe(0);
  });

  it('incorpora un habilitador que no alcanza lo que su edge exige', () => {
    // FRL is in gap and BRL enables it, but BRL only has 2 and the
    // edge asks for 3: pushing FRL without raising BRL would be useless.
    const g = DependencyGraph.create([e('BRL', 'FRL', 3)], minimums(4));
    const c = service.compute(levels({ FRL: 2, BRL: 2 }), g);
    expect([...c].sort()).toEqual(['BRL', 'FRL']);
  });

  it('no incorpora un habilitador que sí cumple lo que su edge exige', () => {
    // BRL at 4: it is neither below its own minimum (4) nor below what the
    // edge asks for (3). There is no reason to intervene in it.
    const g = DependencyGraph.create([e('BRL', 'FRL', 3)], minimums(4));
    const c = service.compute(levels({ FRL: 2, BRL: 4 }), g);
    expect([...c]).toEqual(['FRL']);
  });

  it('alcanza el punto fijo: incorpora al habilitador del habilitador', () => {
    // This is the case a single pass over the focus would miss, and the
    // reason the closure is computed with a work list.
    //
    //   TmRL(1) --req 5--> BRL(1) --req 5--> FRL(2)
    //
    // Only FRL is in gap by its minimum. BRL comes in because FRL demands
    // it; TmRL comes in because BRL demands it. A single pass would have
    // stopped at BRL and the phase order would have come out incomplete.
    const g = DependencyGraph.create(
      [e('TmRL', 'BRL', 5), e('BRL', 'FRL', 5)],
      minimums(4),
    );
    const c = service.compute(levels({ FRL: 2, BRL: 1, TmRL: 1 }), g);
    expect([...c].sort()).toEqual(['BRL', 'FRL', 'TmRL']);
  });

  it('encadena tres levels de habilitadores', () => {
    const g = DependencyGraph.create(
      [e('TmRL', 'TRL', 6), e('TRL', 'BRL', 6), e('BRL', 'FRL', 6)],
      minimums(4),
    );
    const c = service.compute(
      levels({ FRL: 2, BRL: 5, TRL: 5, TmRL: 5 }),
      g,
    );
    expect([...c].sort()).toEqual(['BRL', 'FRL', 'TRL', 'TmRL']);
  });

  it('un perfil sano produce un cierre vacío', () => {
    const g = DependencyGraph.create([e('BRL', 'FRL', 3)], minimums(4));
    expect(service.compute(levels({}), g).size).toBe(0);
  });

  it('no entra en bucle cuando dos dimensions se habilitan en cadena larga', () => {
    // Termination: each node enters the queue at most once.
    const g = DependencyGraph.create(
      [e('TmRL', 'TRL', 9), e('TRL', 'CRL', 9), e('CRL', 'BRL', 9), e('BRL', 'IPRL', 9)],
      minimums(4),
    );
    const c = service.compute(
      levels({ IPRL: 1, BRL: 1, CRL: 1, TRL: 1, TmRL: 1 }),
      g,
    );
    expect(c.size).toBe(5);
  });
});

describe('RoadmapClosureService — perfiles incompletos', () => {
  it('ignora dimensions ausentes del perfil en vez de tratarlas como cero', () => {
    // A missing level is not a low level: assuming 0 would put in the
    // roadmap a dimension nothing is known about.
    const g = DependencyGraph.create([e('BRL', 'FRL', 5)], minimums(4));
    const partial = new Map<DimensionCode, number>([['FRL', 2]]);

    const c = service.compute(partial, g);
    expect([...c]).toEqual(['FRL']);
  });
});
