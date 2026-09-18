import { InvariantViolationError } from '../../../shared/kernel/domain/errors/invariant-violation.error.js';

/**
 * `DiagnosticState` — finite state machine for a single diagnostic.
 *
 * The states match the CHECK constraint on `irl_diagnostic.diagnostic`.
 * Transitions are linear:
 *
 *   STARTED
 *     → WITH_CONSENT               (RF-03 — Law 1581 consent recorded)
 *     → WITH_INITIATIVE            (RF-04 — name, sector and description saved)
 *     → QUESTIONNAIRE_IN_PROGRESS  (RF-05 — questionnaire started)
 *     → QUESTIONNAIRE_COMPLETE     (RF-06 — all 48 answers in)
 *     → PROFILE_GENERATED          (RF-07/08 — IRL levels and bottleneck computed)
 *     → DEEP_ANALYSIS_DECLINED | DEEP_ANALYSIS_IN_PROGRESS
 *          → DEEP_ANALYSIS_COMPLETE
 *
 * Each transition's *trigger* is feature work (a use case will call
 * `next()` or `assertCanTransitionTo()`). The state machine itself is
 * a structural invariant and belongs here so every consumer agrees on
 * the same legal moves.
 */
export type DiagnosticStateName =
  | 'STARTED'
  | 'WITH_CONSENT'
  | 'WITH_INITIATIVE'
  | 'QUESTIONNAIRE_IN_PROGRESS'
  | 'QUESTIONNAIRE_COMPLETE'
  | 'PROFILE_GENERATED'
  | 'DEEP_ANALYSIS_DECLINED'
  | 'DEEP_ANALYSIS_IN_PROGRESS'
  | 'DEEP_ANALYSIS_COMPLETE';

export const DIAGNOSTIC_STATES: readonly DiagnosticStateName[] = [
  'STARTED',
  'WITH_CONSENT',
  'WITH_INITIATIVE',
  'QUESTIONNAIRE_IN_PROGRESS',
  'QUESTIONNAIRE_COMPLETE',
  'PROFILE_GENERATED',
  'DEEP_ANALYSIS_DECLINED',
  'DEEP_ANALYSIS_IN_PROGRESS',
  'DEEP_ANALYSIS_COMPLETE',
];

/** Adjacency map: `state → states it may transition to` (single step). */
const TRANSITIONS: Readonly<
  Record<DiagnosticStateName, readonly DiagnosticStateName[]>
> = {
  STARTED: ['WITH_CONSENT'],
  WITH_CONSENT: ['WITH_INITIATIVE'],
  WITH_INITIATIVE: ['QUESTIONNAIRE_IN_PROGRESS'],
  QUESTIONNAIRE_IN_PROGRESS: ['QUESTIONNAIRE_COMPLETE'],
  QUESTIONNAIRE_COMPLETE: ['PROFILE_GENERATED'],
  PROFILE_GENERATED: ['DEEP_ANALYSIS_DECLINED', 'DEEP_ANALYSIS_IN_PROGRESS'],
  DEEP_ANALYSIS_DECLINED: [],
  DEEP_ANALYSIS_IN_PROGRESS: ['DEEP_ANALYSIS_COMPLETE'],
  DEEP_ANALYSIS_COMPLETE: [],
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
    return new DiagnosticState('STARTED');
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
