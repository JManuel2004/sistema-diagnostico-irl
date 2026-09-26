import type { Diagnosis } from '../entities/diagnosis.aggregate.js';

/**
 * Repository port for the `Diagnosis` aggregate.
 *
 * `save(diagnosis)` is an upsert keyed by `id`. The
 * adapter uses TypeORM's `save` (insert-or-update by primary key) so
 * the same call handles both first-write and state transitions.
 *
 * Querying by user is exposed via `findLatestByUserId` (resuming an
 * unfinished diagnostic) and `findAllByUserId` (the user's list, HU-03).
 */
export const DIAGNOSIS_REPOSITORY = Symbol('DIAGNOSIS_REPOSITORY');

export interface DiagnosisRepositoryPort {
  findById(id: string): Promise<Diagnosis | null>;
  findLatestByUserId(userId: string): Promise<Diagnosis | null>;
  findAllByUserId(userId: string): Promise<Diagnosis[]>;
  save(diagnosis: Diagnosis): Promise<void>;
  /**
   * Loads the diagnostic, applies `change` and saves it as one step that
   * no concurrent `modify` of the same diagnostic can interleave with. It
   * is for changes two event listeners may make at the same time. Resolves
   * `null`, without calling `change`, when the diagnostic does not exist.
   */
  modify(id: string, change: (diagnosis: Diagnosis) => void): Promise<Diagnosis | null>;
}
