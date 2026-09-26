import type { RoadmapDimensionTarget } from '@innlab/contracts';

/**
 * Sentences that put into words what the backend already decided.
 *
 * Nothing here calculates or decides: `inclusionReason`, `expectedMinimum`
 * and `targetDrivenBy` come in the response. This module only phrases them,
 * in language that does not require knowing the framework, so the phase
 * card and the explanation panel say the same thing.
 */

export function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** Why the dimension is in the plan. */
export function inclusionSentence(d: RoadmapDimensionTarget): string {
  if (d.inclusionReason === 'BELOW_EXPECTED_MINIMUM') {
    return `Está por debajo de lo que se espera: debería llegar al menos al nivel ${String(d.expectedMinimum)}.`;
  }
  const dependents = d.enables.map((e) => e.shortName);
  const verb = dependents.length === 1 ? 'necesita' : 'necesitan';
  return `Ya cumple lo que se espera, pero ${listNames(dependents)} ${verb} que suba para poder avanzar.`;
}

/** What sets the level it must reach. */
export function targetSentence(d: RoadmapDimensionTarget): string {
  if (d.targetDrivenBy === null) {
    return `La meta es el nivel que se espera de ella: ${String(d.targetLevel)}.`;
  }
  return `${d.targetDrivenBy.shortName} necesita que llegue al nivel ${String(d.targetLevel)}, por eso esa es su meta.`;
}
