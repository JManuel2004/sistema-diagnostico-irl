import { DIMENSIONS } from '../../../../../../src/shared/kernel/infrastructure/database/seeds/data/dimensions.js';

describe('dimensions seed', () => {
  // RF-13: only CRL, BRL and TmRL can be in a critical state. The seed used to
  // leave the flag false for all six, so the rule could not be expressed.
  it('marks exactly CRL, BRL and TmRL as susceptible to a critical state', () => {
    const critical = DIMENSIONS.filter((d) => d.isCriticalDimension).map(
      (d) => d.code,
    );

    expect(critical.sort()).toEqual(['BRL', 'CRL', 'TmRL']);
  });
});
