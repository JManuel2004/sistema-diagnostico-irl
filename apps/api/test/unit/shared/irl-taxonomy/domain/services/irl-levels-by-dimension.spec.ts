import { irlLevelsByDimension } from '../../../../../../src/shared/irl-taxonomy/domain/services/irl-levels-by-dimension.js';

describe('irlLevelsByDimension', () => {
  it('maps each dimension code to its IRL level', () => {
    const levels = irlLevelsByDimension([
      { dimensionCode: 'TRL', irlLevel: 6 },
      { dimensionCode: 'CRL', irlLevel: 4 },
      { dimensionCode: 'IPRL', irlLevel: 1 },
    ]);

    expect(levels.get('TRL')).toBe(6);
    expect(levels.get('CRL')).toBe(4);
    expect(levels.get('IPRL')).toBe(1);
    expect(levels.size).toBe(3);
  });

  it('returns an empty map for no results, without validating the count', () => {
    expect(irlLevelsByDimension([]).size).toBe(0);
  });
});
