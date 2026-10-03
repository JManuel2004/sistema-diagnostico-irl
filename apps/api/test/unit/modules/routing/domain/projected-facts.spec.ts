import { describe, expect, it } from '@jest/globals';
import { factsFromLevels } from '../../../../../src/modules/routing/domain/services/projected-facts.js';

const CHARACTERIZATION = {
  stage: 'validacion',
  sector: 'Agroindustria / AgriTech',
  teamSize: 3,
  academicLinkage: false,
};

describe('factsFromLevels — the facts of a projected profile', () => {
  it('derives AgroConecta facts as the measured profile does', () => {
    const facts = factsFromLevels(
      'diag',
      { TRL: 6, CRL: 4, BRL: 3, IPRL: 1, TmRL: 5, FRL: 2 },
      CHARACTERIZATION,
    );

    expect(facts.bottlenecks).toEqual(['IPRL']);
    expect(facts.gaps).toEqual(['BRL', 'IPRL', 'FRL']);
    expect(facts.averageLevel).toBe(3.5);
    expect(
      facts.imbalances.map((i) => `${i.left}-${i.right}:${i.classification}`),
    ).toEqual([
      'TRL-CRL:MODERATE',
      'TRL-BRL:MODERATE',
      'CRL-BRL:ACCEPTABLE',
      'TmRL-FRL:MODERATE',
      'BRL-IPRL:MODERATE',
      'TRL-IPRL:CRITICAL',
    ]);
    expect(facts.characterization).toBe(CHARACTERIZATION);
  });

  it('reports every dimension tied at the lowest level as the bottleneck', () => {
    const facts = factsFromLevels(
      'diag',
      { TRL: 5, CRL: 5, BRL: 5, IPRL: 5, TmRL: 5, FRL: 4 },
      CHARACTERIZATION,
    );
    expect(facts.bottlenecks).toEqual(['FRL']);

    const tied = factsFromLevels(
      'diag',
      { TRL: 4, CRL: 4, BRL: 6, IPRL: 6, TmRL: 6, FRL: 6 },
      CHARACTERIZATION,
    );
    expect(tied.bottlenecks).toEqual(['TRL', 'CRL']);
    expect(tied.gaps).toEqual([]);
  });
});
