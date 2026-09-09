import { describe, expect, it } from '@jest/globals';
import type { DimensionCode } from '@innlab/contracts';
import { DependencyGraph } from '../../../../../src/modules/scaling-roadmap/domain/value-objects/dependency-graph.vo.js';
import { TargetLevelCalculatorService } from '../../../../../src/modules/scaling-roadmap/domain/services/target-level-calculator.service.js';

const DIMS: DimensionCode[] = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'];
const minimos = (n = 4) =>
  DIMS.map((d) => ({ dimension: d, nivelMinimoEsperado: n }));
const e = (o: DimensionCode, d: DimensionCode, req: number) => ({
  origen: o,
  destino: d,
  nivelMinimoRequerido: req,
});
const service = new TargetLevelCalculatorService();

describe('TargetLevelCalculatorService', () => {
  it('sin sucesores en el conjunto, la meta es el mínimo esperado', () => {
    const g = DependencyGraph.create([], minimos(4));
    const metas = service.compute(new Set<DimensionCode>(['FRL']), g);
    expect(metas.get('FRL')).toBe(4);
  });

  it('eleva la meta cuando un sucesor exige más que el mínimo propio', () => {
    // BRL habilita a FRL con req 6: llevarla solo a su mínimo (4)
    // dejaría la dependencia sin satisfacer y la fase siguiente inerte.
    const g = DependencyGraph.create([e('BRL', 'FRL', 6)], minimos(4));
    const metas = service.compute(new Set<DimensionCode>(['BRL', 'FRL']), g);
    expect(metas.get('BRL')).toBe(6);
  });

  it('no eleva la meta si la exigencia del sucesor es menor que el mínimo', () => {
    const g = DependencyGraph.create([e('BRL', 'FRL', 2)], minimos(4));
    const metas = service.compute(new Set<DimensionCode>(['BRL', 'FRL']), g);
    expect(metas.get('BRL')).toBe(4);
  });

  it('toma la mayor exigencia cuando hay varios sucesores', () => {
    const g = DependencyGraph.create(
      [e('TRL', 'CRL', 5), e('TRL', 'IPRL', 8)],
      minimos(4),
    );
    const metas = service.compute(
      new Set<DimensionCode>(['TRL', 'CRL', 'IPRL']),
      g,
    );
    expect(metas.get('TRL')).toBe(8);
  });

  it('ignora sucesores que quedan fuera del conjunto a intervenir', () => {
    // Exigir un nivel por una dimensión que ya está sana sería trabajo
    // sin destinatario.
    const g = DependencyGraph.create([e('BRL', 'FRL', 9)], minimos(4));
    const metas = service.compute(new Set<DimensionCode>(['BRL']), g);
    expect(metas.get('BRL')).toBe(4);
  });

  it('respeta un mínimo esperado distinto por dimensión', () => {
    const g = DependencyGraph.create(
      [],
      DIMS.map((d) => ({
        dimension: d,
        nivelMinimoEsperado: d === 'TRL' ? 7 : 3,
      })),
    );
    const metas = service.compute(new Set<DimensionCode>(['TRL', 'FRL']), g);
    expect(metas.get('TRL')).toBe(7);
    expect(metas.get('FRL')).toBe(3);
  });

  it('un conjunto vacío produce cero metas', () => {
    const g = DependencyGraph.create([], minimos(4));
    expect(service.compute(new Set<DimensionCode>(), g).size).toBe(0);
  });
});
