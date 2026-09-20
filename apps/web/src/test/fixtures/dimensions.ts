import type { DimensionCode, DimensionRef, DimensionResult } from '@innlab/contracts';

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
  };
}
