import type { Initiative } from '../entities/initiative.aggregate.js';

/**
 * Repository port for the `Initiative` aggregate. `save()` is an upsert
 * keyed by `diagnosticId` — one initiative per diagnostic, enforced at
 * the database by `uq_initiative_diagnostic`.
 */
export const INITIATIVE_REPOSITORY = Symbol('INITIATIVE_REPOSITORY');

export interface InitiativeRepositoryPort {
  findByDiagnosticId(diagnosticId: string): Promise<Initiative | null>;
  save(initiative: Initiative): Promise<void>;
}
