import { Uuid } from '../../../shared-kernel/domain/value-objects/uuid.vo.js';
import { DiagnosticState } from './diagnostic-state.vo.js';
import type { DiagnosticStateName } from './diagnostic-state.vo.js';

/**
 * `Diagnostico` — aggregate root for a single diagnostic process.
 *
 * The aggregate carries the foundational fields and the state-machine
 * VO. Use-case-level transitions (`acceptTerms`, `registerInitiative`,
 * `completeQuestionnaire`, etc.) arrive with the HU that needs them
 * and consist of one `next(...)` call followed by a domain event
 * emission. Stage 1 keeps the API surface minimal.
 *
 * Per root `CLAUDE.md`: modules communicate by id only. Other modules
 * never receive a `Diagnostico` instance — they ask the orchestrator
 * via the use cases that live here.
 */
export interface DiagnosticPersistence {
  readonly id: string;
  readonly userId: string;
  readonly state: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class Diagnostico {
  private constructor(
    public readonly id: Uuid,
    public readonly userId: string,
    private _state: DiagnosticState,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  /** Start a fresh diagnostic — the first state is `INICIADO`. */
  static start(userId: string, now: Date = new Date()): Diagnostico {
    return new Diagnostico(
      Uuid.generate(),
      userId,
      DiagnosticState.initial(),
      now,
      now,
    );
  }

  static fromPersistence(row: DiagnosticPersistence): Diagnostico {
    return new Diagnostico(
      Uuid.create(row.id),
      row.userId,
      DiagnosticState.create(row.state),
      row.createdAt,
      row.updatedAt,
    );
  }

  get state(): DiagnosticState {
    return this._state;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Advance the state machine. Throws `InvariantViolationError` if the
   * target is not reachable from the current state.
   */
  transitionTo(target: DiagnosticStateName, now: Date = new Date()): void {
    this._state = this._state.next(target);
    this._updatedAt = now;
  }

  toPersistence(): DiagnosticPersistence {
    return {
      id: this.id.value,
      userId: this.userId,
      state: this._state.value,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
