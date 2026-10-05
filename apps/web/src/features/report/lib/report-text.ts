import type {
  DimensionCode,
  ImbalanceClassification,
  RoadmapDimensionTarget,
} from '@innlab/contracts';

/**
 * Sentences of the report. Nothing here decides: the levels, the
 * classifications and the reasons come in the response, computed by the
 * backend; this module only puts them into words, for someone who does not
 * know the framework.
 */

/** «Negocio, Propiedad intelectual y Financiación». */
export function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** «1 nivel», «3 niveles». */
export function levelWord(n: number): string {
  return `${String(n)} ${n === 1 ? 'nivel' : 'niveles'}`;
}

/** The order the pairs are read in: the most severe first. */
export const SEVERITY_ORDER: Readonly<Record<ImbalanceClassification, number>> = {
  critical: 0,
  moderate: 1,
  acceptable: 2,
};

export const CLASSIFICATION_LABEL: Readonly<Record<ImbalanceClassification, string>> = {
  critical: 'Desequilibrio crítico',
  moderate: 'Desequilibrio moderado',
  acceptable: 'Equilibrado',
};

/** Why a dimension is in the roadmap, in one sentence. */
export function inclusionSentence(d: RoadmapDimensionTarget): string {
  if (d.inclusionReason === 'BELOW_EXPECTED_MINIMUM') {
    return `Está por debajo de lo esperado: debería llegar al menos al nivel ${String(d.expectedMinimum)}.`;
  }
  if (d.inclusionReason === 'BALANCE') {
    return d.targetDrivenBy
      ? `Sube para no quedar muy lejos de ${d.targetDrivenBy.shortName} al final de la ruta.`
      : 'Sube para que al final de la ruta no quede un desequilibrio.';
  }
  const dependents = d.enables.map((e) => e.shortName);
  return `${listNames(dependents)} ${dependents.length === 1 ? 'necesita' : 'necesitan'} que suba para poder avanzar.`;
}

/** The names of some dimensions, from a code → name map. */
export function namesOf(
  codes: readonly DimensionCode[],
  names: Readonly<Partial<Record<DimensionCode, string>>>,
): string {
  return listNames(codes.map((code) => names[code] ?? code));
}
