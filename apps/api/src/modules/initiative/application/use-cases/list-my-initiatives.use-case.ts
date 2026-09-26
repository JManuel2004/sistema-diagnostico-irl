import type { InitiativeSummary } from '@innlab/contracts';
import { type InitiativeRepositoryPort } from '../../domain/repositories/initiative.repository.port.js';
import { type InitiativeProfileRepositoryPort } from '../../domain/repositories/initiative-profile.repository.port.js';
import { type ConsentRepositoryPort } from '../../domain/repositories/consent.repository.port.js';
import { type ConsentTermsCatalogPort } from '../../domain/repositories/consent-terms.port.js';
import { type InitiativeCatalogPort } from '../../domain/repositories/initiative-catalog.port.js';
import { toConsentRecord } from '../dtos/map-initiative-response.js';
import { describeInitiativeProfile } from './describe-initiative-profile.js';

/**
 * The user's initiatives, most recent first (HU-06): what the first step of
 * the wizard offers to diagnose again, with the latest profile to prefill
 * the form and whether its consent is accepted at the current version.
 */
export class ListMyInitiativesUseCase {
  constructor(
    private readonly initiatives: InitiativeRepositoryPort,
    private readonly profiles: InitiativeProfileRepositoryPort,
    private readonly consents: ConsentRepositoryPort,
    private readonly terms: ConsentTermsCatalogPort,
    private readonly catalog: InitiativeCatalogPort,
  ) {}

  async execute(userId: string): Promise<InitiativeSummary[]> {
    const [initiatives, current] = await Promise.all([
      this.initiatives.findByOwner(userId),
      this.terms.findCurrent(),
    ]);

    return Promise.all(
      initiatives.map(async (initiative) => {
        const [consent, profile] = await Promise.all([
          this.consents.findLatestByInitiativeId(initiative.id.value),
          this.profiles.findLatestByInitiativeId(initiative.id.value),
        ]);
        return {
          id: initiative.id.value,
          createdAt: initiative.createdAt.toISOString(),
          consent: consent ? toConsentRecord(consent) : null,
          consentCurrent: consent !== null && consent.termsVersion === current?.version,
          latestProfile: profile ? await describeInitiativeProfile(this.catalog, profile) : null,
        };
      }),
    );
  }
}
