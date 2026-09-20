import { describe, expect, it } from '@jest/globals';
import type { DimensionCode } from '@innlab/contracts';
import { DependencyGraph } from '../../../../../src/modules/roadmap/domain/value-objects/dependency-graph.vo.js';
import { TargetLevelCalculatorService } from '../../../../../src/modules/roadmap/domain/services/target-level-calculator.service.js';

const DIMS: DimensionCode[] = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'];
const minimos = (n = 4) =>
  DIMS.map((d) => ({ dimension: d, minimumExpectedLevel: n }));
const e = (o: DimensionCode, d: DimensionCode, req: number) => ({
  source: o,
  target: d,
  minimumRequiredLevel: req,
});
const service = new TargetLevelCalculatorService();

describe('TargetLevelCalculatorService', () => {
  it('sin sucesores en el conjunto, la meta es el mínimo esperado', () => {
    const g = DependencyGraph.create([], minimos(4));
    const targets = service.compute(new Set<DimensionCode>(['FRL']), g);
    expect(targets.get('FRL')).toBe(4);
  });

  it('eleva la meta cuando un sucesor exige más que el mínimo propio', () => {
    // BRL habilita a FRL con req 6: llevarla solo a su mínimo (4)
    // dejaría la dependencia sin satisfacer y la fase siguiente inerte.
    const g = DependencyGraph.create([e('BRL', 'FRL', 6)], minimos(4));
    const targets = service.compute(new Set<DimensionCode>(['BRL', 'FRL']), g);
    expect(targets.get('BRL')).toBe(6);
  });

  it('no eleva la meta si la exigencia del sucesor es menor que el mínimo', () => {
    const g = DependencyGraph.create([e('BRL', 'FRL', 2)], minimos(4));
    const targets = service.compute(new Set<DimensionCode>(['BRL', 'FRL']), g);
    expect(targets.get('BRL')).toBe(4);
  });

  it('toma la mayor exigencia cuando hay varios sucesores', () => {
    const g = DependencyGraph.create(
      [e('TRL', 'CRL', 5), e('TRL', 'IPRL', 8)],
      minimos(4),
    );
    const targets = service.compute(
      new Set<DimensionCode>(['TRL', 'CRL', 'IPRL']),
      g,
    );
    expect(targets.get('TRL')).toBe(8);
  });

  it('ignora sucesores que quedan fuera del conjunto a intervenir', () => {
    // Exigir un nivel por una dimensión que ya está sana sería trabajo
    // sin destinatario.
    const g = DependencyGraph.create([e('BRL', 'FRL', 9)], minimos(4));
    const targets = service.compute(new Set<DimensionCode>(['BRL']), g);
    expect(targets.get('BRL')).toBe(4);
  });

  it('respeta un mínimo esperado distinto por dimensión', () => {
    const g = DependencyGraph.create(
      [],
      DIMS.map((d) => ({
        dimension: d,
        minimumExpectedLevel: d === 'TRL' ? 7 : 3,
      })),
    );
    const targets = service.compute(new Set<DimensionCode>(['TRL', 'FRL']), g);
    expect(targets.get('TRL')).toBe(7);
    expect(targets.get('FRL')).toBe(3);
  });

  it('un conjunto vacío produce cero targets', () => {
    const g = DependencyGraph.create([], minimos(4));
    expect(service.compute(new Set<DimensionCode>(), g).size).toBe(0);
  });

  describe('demandedBy', () => {
    it('es null cuando la meta es el mínimo esperado', () => {
      const g = DependencyGraph.create([e('BRL', 'FRL', 2)], minimos(4));
      const closure = new Set<DimensionCode>(['BRL', 'FRL']);
      expect(service.demandedBy('BRL', closure, g)).toBeNull();
    });

    it('es null cuando la exigencia iguala el mínimo (no lo fija nadie más)', () => {
      const g = DependencyGraph.create([e('BRL', 'FRL', 4)], minimos(4));
      const closure = new Set<DimensionCode>(['BRL', 'FRL']);
      expect(service.demandedBy('BRL', closure, g)).toBeNull();
    });

    it('nombra al sucesor cuya exigencia supera el mínimo', () => {
      const g = DependencyGraph.create([e('BRL', 'FRL', 6)], minimos(4));
      const closure = new Set<DimensionCode>(['BRL', 'FRL']);
      expect(service.demandedBy('BRL', closure, g)).toBe('FRL');
    });

    it('nombra al de mayor exigencia entre varios sucesores', () => {
      const g = DependencyGraph.create(
        [e('TRL', 'CRL', 5), e('TRL', 'IPRL', 8)],
        minimos(4),
      );
      const closure = new Set<DimensionCode>(['TRL', 'CRL', 'IPRL']);
      expect(service.demandedBy('TRL', closure, g)).toBe('IPRL');
    });

    it('ante igual exigencia gana la primera en el orden canónico del marco', () => {
      const g = DependencyGraph.create(
        [e('TRL', 'FRL', 7), e('TRL', 'CRL', 7)],
        minimos(4),
      );
      const closure = new Set<DimensionCode>(['TRL', 'CRL', 'FRL']);
      expect(service.demandedBy('TRL', closure, g)).toBe('CRL');
    });

    it('ignora sucesores fuera del conjunto a intervenir', () => {
      const g = DependencyGraph.create([e('BRL', 'FRL', 8)], minimos(4));
      expect(service.demandedBy('BRL', new Set<DimensionCode>(['BRL']), g)).toBeNull();
    });
  });
});
