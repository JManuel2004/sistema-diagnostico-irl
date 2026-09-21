import type { RoadmapDimensionTarget } from '@innlab/contracts';

/**
 * Frases que ponen en palabras lo que el backend ya decidió.
 *
 * Nada aquí calcula ni decide: `inclusionReason`, `expectedMinimum` y
 * `targetDrivenBy` llegan en la respuesta. Este módulo solo los redacta, en
 * lenguaje que no exige conocer el marco, para que la tarjeta de fase y el
 * panel de explicación digan lo mismo.
 */

export function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** Por qué la dimensión está en el plan. */
export function inclusionSentence(d: RoadmapDimensionTarget): string {
  if (d.inclusionReason === 'BELOW_EXPECTED_MINIMUM') {
    return `Está por debajo de lo que se espera: debería llegar al menos al nivel ${String(d.expectedMinimum)}.`;
  }
  const dependents = d.enables.map((e) => e.shortName);
  const verb = dependents.length === 1 ? 'necesita' : 'necesitan';
  return `Ya cumple lo que se espera, pero ${listNames(dependents)} ${verb} que suba para poder avanzar.`;
}

/** Qué fija el nivel al que debe llegar. */
export function targetSentence(d: RoadmapDimensionTarget): string {
  if (d.targetDrivenBy === null) {
    return `La meta es el nivel que se espera de ella: ${String(d.targetLevel)}.`;
  }
  return `${d.targetDrivenBy.shortName} necesita que llegue al nivel ${String(d.targetLevel)}, por eso esa es su meta.`;
}
