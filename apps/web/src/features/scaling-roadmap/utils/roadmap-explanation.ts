import type { RoadmapDimensionTarget } from '@innlab/contracts';

/**
 * Frases que ponen en palabras lo que el backend ya decidió.
 *
 * Nada aquí calcula ni decide: `inclusionReason`, `expectedMinimum` y
 * `targetDrivenBy` llegan en la respuesta. Este módulo solo los redacta,
 * para que la tarjeta de fase y el panel de explicación digan lo mismo.
 */

function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** Por qué la dimensión está en el roadmap. */
export function inclusionSentence(d: RoadmapDimensionTarget): string {
  if (d.inclusionReason === 'BELOW_EXPECTED_MINIMUM') {
    return `Está por debajo del mínimo esperado (nivel ${String(d.expectedMinimum)}).`;
  }
  const dependents = d.enables.map((e) => e.shortName);
  const verb = dependents.length === 1 ? 'la necesita' : 'la necesitan';
  return `Cumple su mínimo esperado, pero ${listNames(dependents)} ${verb} en un nivel más alto para avanzar.`;
}

/** Qué fija el nivel meta. */
export function targetSentence(d: RoadmapDimensionTarget): string {
  if (d.targetDrivenBy === null) {
    return 'La meta es su mínimo esperado.';
  }
  return `La meta la fija ${d.targetDrivenBy.shortName}, que la necesita en nivel ${String(d.targetLevel)}.`;
}
