import type { Initiative } from '../entities/initiative.aggregate.js';
import type { Consent } from '../entities/consent.entity.js';

export const INITIATIVE_REPOSITORY = Symbol('INITIATIVE_REPOSITORY');

export interface InitiativeRepositoryPort {
  findById(id: string): Promise<Initiative | null>;
  /** The user's initiatives, most recent first. */
  findByOwner(ownerId: string): Promise<Initiative[]>;
  /**
   * Stores a new initiative together with its first consent, atomically:
   * an initiative is never stored without the consent that allows it
   * (RF-03, RNF-06).
   */
  createWithConsent(initiative: Initiative, consent: Consent): Promise<void>;
}
