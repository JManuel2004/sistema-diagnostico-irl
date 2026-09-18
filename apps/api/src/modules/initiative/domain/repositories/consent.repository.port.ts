import type { Consent } from '../entities/consent.entity.js';

/**
 * Repository port for the `Consent` entity. `save()` is an upsert keyed
 * by `diagnosticId` — one consent record per diagnostic, enforced at the
 * database by `uq_consent_diagnostic`.
 */
export const CONSENT_REPOSITORY = Symbol('CONSENT_REPOSITORY');

export interface ConsentRepositoryPort {
  findByDiagnosticId(diagnosticId: string): Promise<Consent | null>;
  save(consent: Consent): Promise<void>;
}
