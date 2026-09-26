import type { InitiativeProfile } from '../entities/initiative-profile.aggregate.js';

export const INITIATIVE_PROFILE_REPOSITORY = Symbol('INITIATIVE_PROFILE_REPOSITORY');

export interface InitiativeProfileRepositoryPort {
  findByDiagnosticId(diagnosticId: string): Promise<InitiativeProfile | null>;
  /** The most recent snapshot of an initiative, to prefill a new diagnostic. */
  findLatestByInitiativeId(initiativeId: string): Promise<InitiativeProfile | null>;
  /** Stores the diagnostic's snapshot, replacing a previous one of the same diagnostic. */
  save(profile: InitiativeProfile): Promise<void>;
}
