import type { PhaseServiceTrace, RoadmapDimensionTarget, RoadmapPhase } from '@innlab/contracts';

/**
 * Sentences that put into words what the backend already decided.
 *
 * Nothing here calculates or decides: the reasons, the targets and the
 * trace of each phase's service come in the response. This module only
 * phrases them, in language that does not require knowing the framework,
 * so the phase card and the explanation panel say the same thing.
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
  if (d.inclusionReason === 'BALANCE') {
    const partner = d.targetDrivenBy?.shortName;
    return partner
      ? `Ya cumple lo que se espera, pero quedaría muy lejos de ${partner}: sube para que al final no quede un desequilibrio.`
      : 'Ya cumple lo que se espera, pero sube para que al final no quede un desequilibrio.';
  }
  const dependents = d.enables.map((e) => e.shortName);
  const verb = dependents.length === 1 ? 'necesita' : 'necesitan';
  return `Ya cumple lo que se espera, pero ${listNames(dependents)} ${verb} que suba para poder avanzar.`;
}

/** What sets the level it must reach at the end of the route. */
export function targetSentence(d: RoadmapDimensionTarget): string {
  const final = String(d.finalTargetLevel);
  if (d.targetReason === 'ENABLES' && d.targetDrivenBy) {
    return `${d.targetDrivenBy.shortName} necesita que llegue al nivel ${final}, por eso esa es su meta.`;
  }
  if (d.targetReason === 'BALANCE' && d.targetDrivenBy) {
    return `Su meta es el nivel ${final}, a un nivel de ${d.targetDrivenBy.shortName}, para que las dos avancen parejas.`;
  }
  return `La meta es el nivel que se espera de ella: ${final}.`;
}

/** When a rise spans several phases: where this phase leaves it. */
export function stretchSentence(d: RoadmapDimensionTarget): string | null {
  if (d.targetLevel >= d.finalTargetLevel) return null;
  return `En esta fase sube hasta el nivel ${String(d.targetLevel)}; sigue en la próxima fase hasta el ${String(d.finalTargetLevel)}.`;
}

const ROLE: Readonly<Record<string, string>> = {
  primary: 'como foco principal',
  secondary: 'como apoyo',
  marginal: 'de forma marginal',
  not_applicable: 'no la trabaja',
};

/**
 * Why a phase proposes its service, in a few sentences: the
 * recommendation opens the route, or the service works the phase's
 * dimensions in a way the trace records.
 */
export function phaseServiceReasons(phase: RoadmapPhase): string[] {
  const trace: PhaseServiceTrace = phase.serviceTrace;
  const service = phase.service;
  if (!service) {
    return [
      'Ningún servicio del portafolio está disponible para esta fase con los criterios actuales.',
    ];
  }
  if (trace.mode === 'RECOMMENDATION') {
    return ['Es el servicio que te recomendamos para tu perfil actual: con él empieza la ruta.'];
  }
  const reasons: string[] = [];
  const entry = trace.ranking.find((r) => r.idService === service.idService);
  if (entry?.includedBy) {
    reasons.push(`El centro lo propone para esta fase: ${entry.includedBy.declaredReason}`);
  }
  const names = new Map(phase.dimensions.map((d) => [d.dimensionCode, d.shortName]));
  for (const c of entry?.coverage ?? []) {
    const name = names.get(c.dimension) ?? c.dimension;
    const role = ROLE[c.sourceLabel] ?? ROLE.not_applicable;
    reasons.push(
      c.sourceLabel === 'not_applicable'
        ? `${name} (sube ${String(c.levels)} ${c.levels === 1 ? 'nivel' : 'niveles'}): este servicio no la trabaja.`
        : `Trabaja ${name} ${role}, que en esta fase sube ${String(c.levels)} ${c.levels === 1 ? 'nivel' : 'niveles'}.`,
    );
  }
  const repeated = trace.skipped.filter((s) => s.reason === 'ALREADY_IN_ROUTE').length;
  const lighter = trace.skipped.filter((s) => s.reason === 'LIGHTER_TIER').length;
  const left = repeated + lighter;
  if (left > 0) {
    reasons.push(
      `La ruta no repite servicios ni vuelve a uno más liviano que el de la fase anterior: se dejaron fuera ${String(left)} ${left === 1 ? 'servicio' : 'servicios'}.`,
    );
  }
  return reasons;
}
