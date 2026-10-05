import type { Diagnosis } from '../entities/diagnosis.aggregate.js';

/**
 * Repository port for the `Diagnosis` aggregate.
 *
 * `save(diagnosis)` is an upsert keyed by `id`. The
 * adapter uses TypeORM's `save` (insert-or-update by primary key) so
 * the same call handles both first-write and state transitions.
 *
 * Querying by user is exposed via `findAllByUserId` (the user's list,
 * HU-03). `deleteIncompleteByUserId` discards the diagnostics a user left
 * unfinished, when they start a new one (DIAGIRL-26).
 */
export const DIAGNOSIS_REPOSITORY = Symbol('DIAGNOSIS_REPOSITORY');

export interface DiagnosisRepositoryPort {
  findById(id: string): Promise<Diagnosis | null>;
  findAllByUserId(userId: string): Promise<Diagnosis[]>;
  /**
   * Deletes the user's diagnostics that are not `completed` (no maturity
   * profile yet), with what hangs from them (their initiative profile
   * snapshot), and resolves how many were deleted. A completed diagnostic
   * is never touched.
   */
  deleteIncompleteByUserId(userId: string): Promise<number>;
  save(diagnosis: Diagnosis): Promise<void>;
  /**
   * Loads the diagnostic, applies `change` and saves it as one step that
   * no concurrent `modify` of the same diagnostic can interleave with. It
   * is for changes two event listeners may make at the same time. Resolves
   * `null`, without calling `change`, when the diagnostic does not exist.
   */
  modify(
    id: string,
    change: (diagnosis: Diagnosis) => void,
  ): Promise<Diagnosis | null>;
}
