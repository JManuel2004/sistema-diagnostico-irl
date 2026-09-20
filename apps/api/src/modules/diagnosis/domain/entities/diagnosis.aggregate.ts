import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { DiagnosisState } from '../value-objects/diagnosis-state.vo.js';
import type { DiagnosisStateName } from '../value-objects/diagnosis-state.vo.js';

/**
 * `Diagnosis` — aggregate root for a single diagnostic process.
 *
 * The aggregate carries the foundational fields and the state-machine
 * VO. Use-case-level transitions (`acceptTerms`, `registerInitiative`,
 * `completeQuestionnaire`, etc.) arrive with the HU that needs them
 * and consist of one `next(...)` call followed by a domain event
 * emission. Stage 1 keeps the API surface minimal.
 *
 * Modules communicate by id only. Other modules never receive a
 * `Diagnosis` instance — they ask the orchestrator via the use
 * cases that live here.
 */
export interface DiagnosisPersistence {
  readonly id: string;
  readonly userId: string;
  readonly state: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class Diagnosis {
  private constructor(
    public readonly id: Uuid,
    public readonly userId: string,
    private _state: DiagnosisState,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  /** Start a fresh diagnostic — the first state is `STARTED`. */
  static start(userId: string, now: Date = new Date()): Diagnosis {
    return new Diagnosis(
      Uuid.generate(),
      userId,
      DiagnosisState.initial(),
      now,
      now,
    );
  }

  static fromPersistence(row: DiagnosisPersistence): Diagnosis {
    return new Diagnosis(
      Uuid.create(row.id),
      row.userId,
      DiagnosisState.create(row.state),
      row.createdAt,
      row.updatedAt,
    );
  }

  get state(): DiagnosisState {
    return this._state;
  }

  /** The user accepted the deep analysis (RF-11): it is in progress or done. */
  get deepAnalysisAccepted(): boolean {
    return (
      this._state.value === 'DEEP_ANALYSIS_IN_PROGRESS' ||
      this._state.value === 'DEEP_ANALYSIS_COMPLETE'
    );
  }

  /**
   * The questionnaire was processed and the maturity profile exists (RF-07):
   * the results can be read. Until then the diagnostic is still being filled
   * in and can be resumed.
   */
  get completed(): boolean {
    return (
      this._state.value === 'PROFILE_GENERATED' ||
      this._state.value === 'DEEP_ANALYSIS_DECLINED' ||
      this.deepAnalysisAccepted
    );
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Advance the state machine. Throws `InvariantViolationError` if the
   * target is not reachable from the current state.
   */
  transitionTo(target: DiagnosisStateName, now: Date = new Date()): void {
    this._state = this._state.next(target);
    this._updatedAt = now;
  }

  toPersistence(): DiagnosisPersistence {
    return {
      id: this.id.value,
      userId: this.userId,
      state: this._state.value,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
