import type { DimensionCode } from '@innlab/contracts';
import { kahnLayers } from '../../../../../src/modules/roadmap/domain/services/kahn-layers.js';
import { DependencyGraphCycleError } from '../../../../../src/modules/roadmap/domain/exceptions/roadmap.errors.js';

const edge = (source: DimensionCode, target: DimensionCode) => ({
  source,
  target,
  minimumRequiredLevel: 3,
});

describe('kahnLayers', () => {
  it('puts nodes without a dependency between them in the same layer, in canonical order', () => {
    const layers = kahnLayers(new Set<DimensionCode>(['FRL', 'BRL', 'IPRL']), [
      edge('IPRL', 'FRL'),
      edge('BRL', 'FRL'),
    ]);

    expect(layers).toEqual([['BRL', 'IPRL'], ['FRL']]);
  });

  it('ignores edges with an end outside the node set', () => {
    // TRL is not in the set: its edge to BRL must not block BRL.
    const layers = kahnLayers(new Set<DimensionCode>(['BRL']), [
      edge('TRL', 'BRL'),
    ]);

    expect(layers).toEqual([['BRL']]);
  });

  it('throws DependencyGraphCycleError naming the nodes left in a cycle', () => {
    expect(() =>
      kahnLayers(new Set<DimensionCode>(['TRL', 'CRL']), [
        edge('TRL', 'CRL'),
        edge('CRL', 'TRL'),
      ]),
    ).toThrow(DependencyGraphCycleError);
  });

  it('returns no layers for an empty set', () => {
    expect(kahnLayers(new Set(), [])).toEqual([]);
  });
});
