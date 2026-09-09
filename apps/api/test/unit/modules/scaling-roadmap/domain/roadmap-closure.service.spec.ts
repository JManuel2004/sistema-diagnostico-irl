import { describe, expect, it } from '@jest/globals';
import type { DimensionCode } from '@innlab/contracts';
import { DependencyGraph } from '../../../../../src/modules/scaling-roadmap/domain/value-objects/dependency-graph.vo.js';
import { RoadmapClosureService } from '../../../../../src/modules/scaling-roadmap/domain/services/roadmap-closure.service.js';

const DIMS: DimensionCode[] = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'];
const minimos = (n = 4) =>
  DIMS.map((d) => ({ dimension: d, nivelMinimoEsperado: n }));
const e = (o: DimensionCode, d: DimensionCode, req: number) => ({
  origen: o,
  destino: d,
  nivelMinimoRequerido: req,
});
const niveles = (n: Partial<Record<DimensionCode, number>>) =>
  new Map<DimensionCode, number>(
    DIMS.map((d) => [d, n[d] ?? 9]),
  );

const service = new RoadmapClosureService();

describe('RoadmapClosureService', () => {
  it('el foco son las dimensiones por debajo de su mínimo esperado', () => {
    const g = DependencyGraph.create([], minimos(4));
    const c = service.compute(niveles({ BRL: 3, FRL: 2 }), g);
    expect([...c].sort()).toEqual(['BRL', 'FRL']);
  });

  it('una dimensión exactamente en su mínimo no entra al foco', () => {
    const g = DependencyGraph.create([], minimos(4));
    expect(service.compute(niveles({ CRL: 4 }), g).size).toBe(0);
  });

  it('incorpora un habilitador que no alcanza lo que su arista exige', () => {
    // FRL está en brecha y BRL la habilita, pero BRL solo tiene 2 y la
    // arista pide 3: empujar FRL sin subir BRL no serviría de nada.
    const g = DependencyGraph.create([e('BRL', 'FRL', 3)], minimos(4));
    const c = service.compute(niveles({ FRL: 2, BRL: 2 }), g);
    expect([...c].sort()).toEqual(['BRL', 'FRL']);
  });

  it('no incorpora un habilitador que sí cumple lo que su arista exige', () => {
    // BRL en 4: ni está bajo su propio mínimo (4) ni bajo lo que la
    // arista pide (3). No hay razón para intervenirla.
    const g = DependencyGraph.create([e('BRL', 'FRL', 3)], minimos(4));
    const c = service.compute(niveles({ FRL: 2, BRL: 4 }), g);
    expect([...c]).toEqual(['FRL']);
  });

  it('alcanza el punto fijo: incorpora al habilitador del habilitador', () => {
    // Este es el caso que una sola pasada sobre el foco perdería, y la
    // razón por la que el cierre se calcula con lista de trabajo.
    //
    //   TmRL(1) --req 5--> BRL(1) --req 5--> FRL(2)
    //
    // Solo FRL está en brecha por su mínimo. BRL entra por exigencia de
    // FRL; TmRL entra por exigencia de BRL. Una única pasada se habría
    // detenido en BRL y el orden de fases habría salido incompleto.
    const g = DependencyGraph.create(
      [e('TmRL', 'BRL', 5), e('BRL', 'FRL', 5)],
      minimos(4),
    );
    const c = service.compute(niveles({ FRL: 2, BRL: 1, TmRL: 1 }), g);
    expect([...c].sort()).toEqual(['BRL', 'FRL', 'TmRL']);
  });

  it('encadena tres niveles de habilitadores', () => {
    const g = DependencyGraph.create(
      [e('TmRL', 'TRL', 6), e('TRL', 'BRL', 6), e('BRL', 'FRL', 6)],
      minimos(4),
    );
    const c = service.compute(
      niveles({ FRL: 2, BRL: 5, TRL: 5, TmRL: 5 }),
      g,
    );
    expect([...c].sort()).toEqual(['BRL', 'FRL', 'TRL', 'TmRL']);
  });

  it('un perfil sano produce un cierre vacío', () => {
    const g = DependencyGraph.create([e('BRL', 'FRL', 3)], minimos(4));
    expect(service.compute(niveles({}), g).size).toBe(0);
  });

  it('no entra en bucle cuando dos dimensiones se habilitan en cadena larga', () => {
    // Terminación: cada nodo entra a la cola a lo sumo una vez.
    const g = DependencyGraph.create(
      [e('TmRL', 'TRL', 9), e('TRL', 'CRL', 9), e('CRL', 'BRL', 9), e('BRL', 'IPRL', 9)],
      minimos(4),
    );
    const c = service.compute(
      niveles({ IPRL: 1, BRL: 1, CRL: 1, TRL: 1, TmRL: 1 }),
      g,
    );
    expect(c.size).toBe(5);
  });
});

describe('RoadmapClosureService — perfiles incompletos', () => {
  it('ignora dimensiones ausentes del perfil en vez de tratarlas como cero', () => {
    // Un nivel ausente no es un nivel bajo: asumir 0 metería en el
    // roadmap una dimensión sobre la que no se sabe nada.
    const g = DependencyGraph.create([e('BRL', 'FRL', 5)], minimos(4));
    const parcial = new Map<DimensionCode, number>([['FRL', 2]]);

    const c = service.compute(parcial, g);
    expect([...c]).toEqual(['FRL']);
  });
});
