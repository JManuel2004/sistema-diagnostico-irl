import {
  DIMENSION_CODES,
  type DimensionCode,
  type DimensionRef,
  type DimensionResult,
  type GlobalLevel,
  type MaturityProfileResponse,
} from '@innlab/contracts';

/**
 * The names the backend serves for each dimension (mirrors the seed), for
 * fixtures of responses that name dimensions. Test-only: the application
 * keeps no such map and reads the names from the response.
 */
const NAMES: Record<DimensionCode, { name: string; shortName: string }> = {
  TRL: { name: 'Nivel de Madurez Tecnológica', shortName: 'Tecnología' },
  CRL: { name: 'Nivel de Madurez del Cliente', shortName: 'Cliente' },
  BRL: { name: 'Nivel de Madurez del Modelo de Negocio', shortName: 'Negocio' },
  IPRL: {
    name: 'Nivel de Madurez de la Propiedad Intelectual',
    shortName: 'Propiedad Intelectual',
  },
  TmRL: { name: 'Nivel de Madurez del Equipo', shortName: 'Equipo' },
  FRL: { name: 'Nivel de Madurez de la Financiación', shortName: 'Financiación' },
};

export function dimensionRefFixture(code: DimensionCode): DimensionRef {
  return { code, ...NAMES[code] };
}

export function dimensionResultFixture(code: DimensionCode, level: number): DimensionResult {
  return {
    dimensionCode: code,
    ...NAMES[code],
    // Likert is 1..5; the fixtures only need a valid value, not a real conversion.
    averageLikert: Math.min(5, Math.max(1, level)),
    irlLevel: level,
    levelDescription: levelTextFixture(code, level),
  };
}

/** What a level means, as the backend would serve it (test-only text). */
export function levelTextFixture(code: DimensionCode, level: number): string {
  return `Qué significa el nivel ${String(level)} en ${NAMES[code].shortName}.`;
}

/** The nine level texts of each dimension (`levelScale` of the profile). */
export function levelScaleFixture(): MaturityProfileResponse['levelScale'] {
  return Object.fromEntries(
    DIMENSION_CODES.map((code) => [
      code,
      Array.from({ length: 9 }, (_, i) => levelTextFixture(code, i + 1)),
    ]),
  );
}

/** The global level an average stands for (rounded half up), with its text. */
export function globalLevelFixture(average: number): GlobalLevel {
  const level = Math.min(9, Math.max(1, Math.round(average)));
  return { level, description: `Qué significa el nivel global ${String(level)}.` };
}
