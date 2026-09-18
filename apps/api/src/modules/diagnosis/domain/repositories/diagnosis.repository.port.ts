import type { Diagnosis } from '../entities/diagnosis.aggregate.js';

/**
 * Repository port for the `Diagnosis` aggregate.
 *
 * `save(diagnostico)` is an upsert keyed by `id_diagnostico`. The
 * adapter uses TypeORM's `save` (insert-or-update by primary key) so
 * the same call handles both first-write and state transitions.
 *
 * Querying by user (for HU-03 "consultar diagnóstico previo") is
 * exposed via `findLatestByUserId` rather than a generic list method
 * — the orchestrator never paginates from inside this module; if a
 * future feature needs a list, it asks via a use case that crafts the
 * query.
 */
export const DIAGNOSIS_REPOSITORY = Symbol('DIAGNOSIS_REPOSITORY');

export interface DiagnosisRepositoryPort {
  findById(id: string): Promise<Diagnosis | null>;
  findLatestByUserId(userId: string): Promise<Diagnosis | null>;
  findAllByUserId(userId: string): Promise<Diagnosis[]>;
  save(diagnostico: Diagnosis): Promise<void>;
}
