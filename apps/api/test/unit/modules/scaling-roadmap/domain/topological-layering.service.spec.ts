import { describe, expect, it } from '@jest/globals';
import type { DimensionCode } from '@innlab/contracts';
import { DependencyGraph } from '../../../../../src/modules/scaling-roadmap/domain/value-objects/dependency-graph.vo.js';
import { TopologicalLayeringService } from '../../../../../src/modules/scaling-roadmap/domain/services/topological-layering.service.js';
import { DependencyGraphCycleError } from '../../../../../src/modules/scaling-roadmap/domain/errors/roadmap.errors.js';

const DIMS: DimensionCode[] = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'];
const minimos = DIMS.map((d) => ({ dimension: d, nivelMinimoEsperado: 4 }));
const e = (o: DimensionCode, d: DimensionCode, req = 3) => ({
  origen: o,
  destino: d,
  nivelMinimoRequerido: req,
});
const service = new TopologicalLayeringService();

describe('TopologicalLayeringService', () => {
  it('coloca en la capa 0 las dimensiones sin dependencias internas', () => {
    const g = DependencyGraph.create([e('BRL', 'FRL'), e('IPRL', 'FRL')], minimos);
    const capas = service.layer(new Set<DimensionCode>(['BRL', 'IPRL', 'FRL']), g);
    expect(capas).toEqual([['BRL', 'IPRL'], ['FRL']]);
  });

  it('ignora aristas cuyo origen queda fuera del conjunto', () => {
    // CRL habilita a FRL pero no hay que intervenir CRL; esa arista no
    // debe retrasar a FRL, o una dimensión ya sana bloquearía el plan.
    const g = DependencyGraph.create([e('CRL', 'FRL')], minimos);
    const capas = service.layer(new Set<DimensionCode>(['FRL']), g);
    expect(capas).toEqual([['FRL']]);
  });

  it('ignora aristas cuyo destino queda fuera del conjunto', () => {
    const g = DependencyGraph.create([e('BRL', 'CRL')], minimos);
    const capas = service.layer(new Set<DimensionCode>(['BRL']), g);
    expect(capas).toEqual([['BRL']]);
  });

  it('ordena dentro de la capa por el orden canónico del marco', () => {
    // Determinismo, no prioridad: sin esto el orden dependería del
    // recorrido del Set y los tests serían inestables.
    const g = DependencyGraph.create([], minimos);
    const capas = service.layer(
      new Set<DimensionCode>(['FRL', 'TRL', 'IPRL', 'CRL']),
      g,
    );
    expect(capas).toEqual([['TRL', 'CRL', 'IPRL', 'FRL']]);
  });

  it('produce una cadena de capas unitarias cuando todo es secuencial', () => {
    const g = DependencyGraph.create(
      [e('TmRL', 'TRL'), e('TRL', 'CRL'), e('CRL', 'BRL')],
      minimos,
    );
    const capas = service.layer(
      new Set<DimensionCode>(['TmRL', 'TRL', 'CRL', 'BRL']),
      g,
    );
    expect(capas).toEqual([['TmRL'], ['TRL'], ['CRL'], ['BRL']]);
  });

  it('un conjunto vacío produce cero capas', () => {
    const g = DependencyGraph.create([e('BRL', 'FRL')], minimos);
    expect(service.layer(new Set<DimensionCode>(), g)).toEqual([]);
  });

  it('lanza con los nodos implicados si el subgrafo tuviera un ciclo', () => {
    // Red de seguridad. `DependencyGraph.create()` ya rechaza ciclos, así
    // que hay que construir el grafo sin ellos y forzar la condición
    // sobre el servicio directamente.
    const grafoFalso = {
      allEdges: () => [e('BRL', 'FRL'), e('FRL', 'BRL')],
      nodes: () => DIMS,
      expectedMinimum: () => 4,
      incomingEdges: () => [],
      outgoingEdges: () => [],
    } as unknown as DependencyGraph;

    let capturado: DependencyGraphCycleError | undefined;
    try {
      service.layer(new Set<DimensionCode>(['BRL', 'FRL']), grafoFalso);
    } catch (err) {
      capturado = err as DependencyGraphCycleError;
    }

    expect(capturado).toBeInstanceOf(DependencyGraphCycleError);
    expect([...capturado!.dimensionesImplicadas].sort()).toEqual(['BRL', 'FRL']);
  });
});
