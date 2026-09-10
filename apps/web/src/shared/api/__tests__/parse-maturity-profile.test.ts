import { describe, expect, it } from 'vitest';
import { parseMaturityProfileResponse } from '../parse-maturity-profile';

const DIAG_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const DIMENSION_CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

function legacyProfile(overrides: { irlLevels?: number[] } = {}) {
  const levels = overrides.irlLevels ?? [6, 6, 6, 6, 6, 6];
  return {
    diagnosticId: DIAG_ID,
    computedAt: '2026-09-10T21:34:54.523Z',
    dimensionResults: DIMENSION_CODES.map((code, i) => ({
      dimensionCode: code,
      name: code,
      averageLikert: 3,
      irlLevel: levels[i],
    })),
    bottleneck: { dimensions: ['TRL'], level: levels[0] },
    imbalances: [
      { left: 'TRL', right: 'CRL', difference: 0, classification: 'acceptable' },
      { left: 'TRL', right: 'BRL', difference: 0, classification: 'acceptable' },
      { left: 'CRL', right: 'BRL', difference: 0, classification: 'acceptable' },
      { left: 'TmRL', right: 'FRL', difference: 0, classification: 'acceptable' },
      { left: 'BRL', right: 'IPRL', difference: 0, classification: 'acceptable' },
      { left: 'TRL', right: 'IPRL', difference: 0, classification: 'acceptable' },
    ],
  };
}

describe('parseMaturityProfileResponse', () => {
  it('acepta el contrato actual con strength, asymmetry y gaps', () => {
    const current = {
      ...legacyProfile(),
      strength: { dimensions: ['TRL'], level: 6 },
      asymmetry: { difference: 0, classification: 'acceptable' },
      gaps: { dimensions: [], threshold: 3 },
    };

    expect(parseMaturityProfileResponse(current).strength.level).toBe(6);
  });

  it('completa strength, asymmetry y gaps cuando el API de mayo las omite', () => {
    const parsed = parseMaturityProfileResponse(legacyProfile({ irlLevels: [2, 6, 6, 6, 6, 9] }));

    expect(parsed.strength).toEqual({ dimensions: ['FRL'], level: 9 });
    expect(parsed.asymmetry).toEqual({ difference: 7, classification: 'critical' });
    expect(parsed.gaps).toEqual({ dimensions: ['TRL'], threshold: 3 });
  });
});
