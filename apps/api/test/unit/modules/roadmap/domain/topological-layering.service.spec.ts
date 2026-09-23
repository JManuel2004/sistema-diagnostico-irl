import { describe, expect, it } from '@jest/globals';
import type { DimensionCode } from '@innlab/contracts';
import { DependencyGraph } from '../../../../../src/modules/roadmap/domain/value-objects/dependency-graph.vo.js';
import { TopologicalLayeringService } from '../../../../../src/modules/roadmap/domain/services/topological-layering.service.js';
import { DependencyGraphCycleError } from '../../../../../src/modules/roadmap/domain/exceptions/roadmap.errors.js';

const DIMS: DimensionCode[] = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'];
const minimums = DIMS.map((d) => ({ dimension: d, minimumExpectedLevel: 4 }));
const e = (o: DimensionCode, d: DimensionCode, req = 3) => ({
  source: o,
  target: d,
  minimumRequiredLevel: req,
});
const service = new TopologicalLayeringService();

describe('TopologicalLayeringService', () => {
  it('coloca en la capa 0 las dimensions sin dependencies internas', () => {
    const g = DependencyGraph.create([e('BRL', 'FRL'), e('IPRL', 'FRL')], minimums);
    const layers = service.layer(new Set<DimensionCode>(['BRL', 'IPRL', 'FRL']), g);
    expect(layers).toEqual([['BRL', 'IPRL'], ['FRL']]);
  });

  it('ignora edges cuyo source queda fuera del conjunto', () => {
    // CRL enables FRL but CRL needs no intervention; that edge must not
    // delay FRL, or an already healthy dimension would block the plan.
    const g = DependencyGraph.create([e('CRL', 'FRL')], minimums);
    const layers = service.layer(new Set<DimensionCode>(['FRL']), g);
    expect(layers).toEqual([['FRL']]);
  });

  it('ignora edges cuyo target queda fuera del conjunto', () => {
    const g = DependencyGraph.create([e('BRL', 'CRL')], minimums);
    const layers = service.layer(new Set<DimensionCode>(['BRL']), g);
    expect(layers).toEqual([['BRL']]);
  });

  it('ordena dentro de la capa por el orden canónico del marco', () => {
    // Determinism, not priority: without this the order would depend on
    // the Set's iteration and the tests would be unstable.
    const g = DependencyGraph.create([], minimums);
    const layers = service.layer(
      new Set<DimensionCode>(['FRL', 'TRL', 'IPRL', 'CRL']),
      g,
    );
    expect(layers).toEqual([['TRL', 'CRL', 'IPRL', 'FRL']]);
  });

  it('produce una cadena de layers unitarias cuando todo es secuencial', () => {
    const g = DependencyGraph.create(
      [e('TmRL', 'TRL'), e('TRL', 'CRL'), e('CRL', 'BRL')],
      minimums,
    );
    const layers = service.layer(
      new Set<DimensionCode>(['TmRL', 'TRL', 'CRL', 'BRL']),
      g,
    );
    expect(layers).toEqual([['TmRL'], ['TRL'], ['CRL'], ['BRL']]);
  });

  it('un conjunto vacío produce cero layers', () => {
    const g = DependencyGraph.create([e('BRL', 'FRL')], minimums);
    expect(service.layer(new Set<DimensionCode>(), g)).toEqual([]);
  });

  it('lanza con los nodos implicados si el subgrafo tuviera un ciclo', () => {
    // Safety net. `DependencyGraph.create()` already rejects cycles, so
    // the graph has to be built without them and the condition forced
    // on the service directly.
    const fakeGraph = {
      allEdges: () => [e('BRL', 'FRL'), e('FRL', 'BRL')],
      nodes: () => DIMS,
      expectedMinimum: () => 4,
      incomingEdges: () => [],
      outgoingEdges: () => [],
    } as unknown as DependencyGraph;

    let caught: DependencyGraphCycleError | undefined;
    try {
      service.layer(new Set<DimensionCode>(['BRL', 'FRL']), fakeGraph);
    } catch (err) {
      caught = err as DependencyGraphCycleError;
    }

    expect(caught).toBeInstanceOf(DependencyGraphCycleError);
    expect([...caught!.involvedDimensions].sort()).toEqual(['BRL', 'FRL']);
  });
});
