import type { DimensionCode } from '@innlab/contracts';

/**
 * Sentences of the report. Nothing here decides: the values come in the
 * response, computed by the backend; this module only puts them into words.
 */

/** «Negocio, Propiedad intelectual y Financiación». */
export function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** The names of some dimensions, from a code → name map. */
export function namesOf(
  codes: readonly DimensionCode[],
  names: Readonly<Partial<Record<DimensionCode, string>>>,
): string {
  return listNames(codes.map((code) => names[code] ?? code));
}
