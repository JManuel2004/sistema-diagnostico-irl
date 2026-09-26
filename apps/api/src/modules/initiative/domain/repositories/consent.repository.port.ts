import type { Consent } from '../entities/consent.entity.js';

export const CONSENT_REPOSITORY = Symbol('CONSENT_REPOSITORY');

export interface ConsentRepositoryPort {
  /** The latest acceptance of an initiative's consent, or `null`. */
  findLatestByInitiativeId(initiativeId: string): Promise<Consent | null>;
  /** Adds an acceptance to the history; earlier ones are kept. */
  add(consent: Consent): Promise<void>;
}
