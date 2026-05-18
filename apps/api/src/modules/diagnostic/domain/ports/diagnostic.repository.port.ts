import type { Diagnostico } from '../diagnostic.aggregate.js';

/**
 * Repository port for the `Diagnostico` aggregate.
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
export const DIAGNOSTIC_REPOSITORY = Symbol('DIAGNOSTIC_REPOSITORY');

export interface DiagnosticRepositoryPort {
  findById(id: string): Promise<Diagnostico | null>;
  findLatestByUserId(userId: string): Promise<Diagnostico | null>;
  findAllByUserId(userId: string): Promise<Diagnostico[]>;
  save(diagnostico: Diagnostico): Promise<void>;
}
