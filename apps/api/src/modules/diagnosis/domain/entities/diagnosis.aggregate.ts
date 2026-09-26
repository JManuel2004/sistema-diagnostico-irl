import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { DiagnosisState } from '../value-objects/diagnosis-state.vo.js';
import type { DiagnosisStateName } from '../value-objects/diagnosis-state.vo.js';

/**
 * `Diagnosis` — aggregate root for a single diagnostic process.
 *
 * The aggregate carries the foundational fields and the state-machine
 * VO; each transition is one `transitionTo(...)` call made by the use case or
 * listener that needs it.
 *
 * `frameworkVersionId` is the version of the IRL framework content
 * (statements, conversion table) the diagnostic is answered with: the
 * current one when it starts, fixed for the rest of its life.
 *
 * Modules communicate by id only. Other modules never receive a
 * `Diagnosis` instance — they read through the queries this module
 * exports.
 */
export interface DiagnosisPersistence {
  readonly id: string;
  readonly userId: string;
  readonly state: string;
  readonly frameworkVersionId: number;
  readonly createdAt: Date;
  readonly recommendationCalculatedAt?: Date | null;
  readonly roadmapCalculatedAt?: Date | null;
}

/** The two results of the deep analysis, each computed by its own module. */
export type DeepAnalysisResult = 'recommendation' | 'roadmap';

export class Diagnosis {
  private constructor(
    public readonly id: Uuid,
    public readonly userId: string,
    private _state: DiagnosisState,
    public readonly frameworkVersionId: number,
    public readonly createdAt: Date,
    private _recommendationCalculatedAt: Date | null = null,
    private _roadmapCalculatedAt: Date | null = null,
  ) {}

  /**
   * Start a fresh diagnostic with the current framework version — the first
   * state is `STARTED`.
   */
  static start(userId: string, frameworkVersionId: number, now: Date = new Date()): Diagnosis {
    return new Diagnosis(
      Uuid.generate(),
      userId,
      DiagnosisState.initial(),
      frameworkVersionId,
      now,
    );
  }

  static fromPersistence(row: DiagnosisPersistence): Diagnosis {
    return new Diagnosis(
      Uuid.create(row.id),
      row.userId,
      DiagnosisState.create(row.state),
      row.frameworkVersionId,
      row.createdAt,
      row.recommendationCalculatedAt ?? null,
      row.roadmapCalculatedAt ?? null,
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

  /**
   * Advance the state machine. Throws `InvariantViolationError` if the
   * target is not reachable from the current state.
   */
  transitionTo(target: DiagnosisStateName): void {
    this._state = this._state.next(target);
  }

  /**
   * The inputs of the results (answers, initiative profile) can still
   * change: the maturity profile is not generated yet. From then on they
   * are frozen, so the stored results always match them.
   */
  get acceptsAnswers(): boolean {
    return (
      this._state.value === 'WITH_INITIATIVE' ||
      this._state.value === 'QUESTIONNAIRE_IN_PROGRESS' ||
      this._state.value === 'QUESTIONNAIRE_COMPLETE'
    );
  }

  /**
   * Records that one result of the deep analysis was calculated and saved.
   * Once both the recommendation and the roadmap exist, a deep analysis in
   * progress is complete. Recording a result again (a retried calculation)
   * only refreshes its date.
   */
  recordDeepAnalysisResult(result: DeepAnalysisResult, now: Date = new Date()): void {
    if (result === 'recommendation') {
      this._recommendationCalculatedAt = now;
    } else {
      this._roadmapCalculatedAt = now;
    }
    if (
      this._state.value === 'DEEP_ANALYSIS_IN_PROGRESS' &&
      this._recommendationCalculatedAt !== null &&
      this._roadmapCalculatedAt !== null
    ) {
      this.transitionTo('DEEP_ANALYSIS_COMPLETE');
    }
  }

  toPersistence(): DiagnosisPersistence {
    return {
      id: this.id.value,
      userId: this.userId,
      state: this._state.value,
      frameworkVersionId: this.frameworkVersionId,
      createdAt: this.createdAt,
      recommendationCalculatedAt: this._recommendationCalculatedAt,
      roadmapCalculatedAt: this._roadmapCalculatedAt,
    };
  }
}
