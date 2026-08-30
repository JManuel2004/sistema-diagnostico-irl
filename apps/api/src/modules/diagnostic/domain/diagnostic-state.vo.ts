import { InvariantViolationError } from '../../../shared-kernel/domain/errors/invariant-violation.error.js';

/**
 * `DiagnosticState` — finite state machine for a single diagnostic.
 *
 * The states match the CHECK constraint on `irl_diagnostic.diagnostico`
 * (initial migration). Transitions are linear:
 *
 *   INICIADO
 *     → CON_CONSENTIMIENTO   (RF-03 — consentimiento Ley 1581 registrado)
 *     → CON_INICIATIVA       (RF-04 — nombre, sector y descripción guardados)
 *     → CUESTIONARIO_EN_CURSO (RF-05 — cuestionario iniciado)
 *     → CUESTIONARIO_COMPLETO (RF-06 — 48 respuestas completas)
 *     → PERFIL_GENERADO      (RF-07/08 — niveles IRL y cuello de botella calculados)
 *     → ANALISIS_PROFUNDO_DECLINADO | ANALISIS_PROFUNDO_EN_CURSO
 *          → ANALISIS_PROFUNDO_COMPLETO
 *
 * Each transition's *trigger* is feature work (a use case will call
 * `next()` or `assertCanTransitionTo()`). The state machine itself is
 * a structural invariant and belongs here so every consumer agrees on
 * the same legal moves.
 */
export type DiagnosticStateName =
  | 'INICIADO'
  | 'CON_CONSENTIMIENTO'
  | 'CON_INICIATIVA'
  | 'CUESTIONARIO_EN_CURSO'
  | 'CUESTIONARIO_COMPLETO'
  | 'PERFIL_GENERADO'
  | 'ANALISIS_PROFUNDO_DECLINADO'
  | 'ANALISIS_PROFUNDO_EN_CURSO'
  | 'ANALISIS_PROFUNDO_COMPLETO';

export const DIAGNOSTIC_STATES: readonly DiagnosticStateName[] = [
  'INICIADO',
  'CON_CONSENTIMIENTO',
  'CON_INICIATIVA',
  'CUESTIONARIO_EN_CURSO',
  'CUESTIONARIO_COMPLETO',
  'PERFIL_GENERADO',
  'ANALISIS_PROFUNDO_DECLINADO',
  'ANALISIS_PROFUNDO_EN_CURSO',
  'ANALISIS_PROFUNDO_COMPLETO',
];

/** Adjacency map: `state → states it may transition to` (single step). */
const TRANSITIONS: Readonly<
  Record<DiagnosticStateName, readonly DiagnosticStateName[]>
> = {
  INICIADO: ['CON_CONSENTIMIENTO'],
  CON_CONSENTIMIENTO: ['CON_INICIATIVA'],
  CON_INICIATIVA: ['CUESTIONARIO_EN_CURSO'],
  CUESTIONARIO_EN_CURSO: ['CUESTIONARIO_COMPLETO'],
  CUESTIONARIO_COMPLETO: ['PERFIL_GENERADO'],
  PERFIL_GENERADO: ['ANALISIS_PROFUNDO_DECLINADO', 'ANALISIS_PROFUNDO_EN_CURSO'],
  ANALISIS_PROFUNDO_DECLINADO: [],
  ANALISIS_PROFUNDO_EN_CURSO: ['ANALISIS_PROFUNDO_COMPLETO'],
  ANALISIS_PROFUNDO_COMPLETO: [],
};

export class DiagnosticState {
  private constructor(public readonly value: DiagnosticStateName) {}

  static create(input: string): DiagnosticState {
    if (!DIAGNOSTIC_STATES.includes(input as DiagnosticStateName)) {
      throw new InvariantViolationError(
        `Invalid DiagnosticState '${input}'; expected one of ${DIAGNOSTIC_STATES.join(', ')}`,
      );
    }
    return new DiagnosticState(input as DiagnosticStateName);
  }

  static initial(): DiagnosticState {
    return new DiagnosticState('INICIADO');
  }

  equals(other: DiagnosticState): boolean {
    return this.value === other.value;
  }

  canTransitionTo(next: DiagnosticStateName): boolean {
    return TRANSITIONS[this.value].includes(next);
  }

  assertCanTransitionTo(next: DiagnosticStateName): void {
    if (!this.canTransitionTo(next)) {
      throw new InvariantViolationError(
        `Illegal diagnostic transition: ${this.value} → ${next}`,
        { from: this.value, to: next, legal: TRANSITIONS[this.value] },
      );
    }
  }

  next(target: DiagnosticStateName): DiagnosticState {
    this.assertCanTransitionTo(target);
    return new DiagnosticState(target);
  }
}
