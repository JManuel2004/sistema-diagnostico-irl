import { InvariantViolationError } from '../../../../shared/kernel/domain/errors/invariant-violation.error.js';

/**
 * `DiagnosisState` — finite state machine for a single diagnostic.
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
export type DiagnosisStateName =
  | 'STARTED'
  | 'WITH_CONSENT'
  | 'WITH_INITIATIVE'
  | 'QUESTIONNAIRE_IN_PROGRESS'
  | 'QUESTIONNAIRE_COMPLETE'
  | 'PROFILE_GENERATED'
  | 'DEEP_ANALYSIS_DECLINED'
  | 'DEEP_ANALYSIS_IN_PROGRESS'
  | 'DEEP_ANALYSIS_COMPLETE';

export const DIAGNOSIS_STATES: readonly DiagnosisStateName[] = [
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
  Record<DiagnosisStateName, readonly DiagnosisStateName[]>
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

export class DiagnosisState {
  private constructor(public readonly value: DiagnosisStateName) {}

  static create(input: string): DiagnosisState {
    if (!DIAGNOSIS_STATES.includes(input as DiagnosisStateName)) {
      throw new InvariantViolationError(
        `Invalid DiagnosisState '${input}'; expected one of ${DIAGNOSIS_STATES.join(', ')}`,
      );
    }
    return new DiagnosisState(input as DiagnosisStateName);
  }

  static initial(): DiagnosisState {
    return new DiagnosisState('STARTED');
  }

  equals(other: DiagnosisState): boolean {
    return this.value === other.value;
  }

  canTransitionTo(next: DiagnosisStateName): boolean {
    return TRANSITIONS[this.value].includes(next);
  }

  assertCanTransitionTo(next: DiagnosisStateName): void {
    if (!this.canTransitionTo(next)) {
      throw new InvariantViolationError(
        `Illegal diagnostic transition: ${this.value} → ${next}`,
        { from: this.value, to: next, legal: TRANSITIONS[this.value] },
      );
    }
  }

  next(target: DiagnosisStateName): DiagnosisState {
    this.assertCanTransitionTo(target);
    return new DiagnosisState(target);
  }
}
