import type {
  ConsentRecord,
  Initiative as InitiativeProfileResponse,
} from '@innlab/contracts';
import type { InitiativeProfile } from '../../domain/entities/initiative-profile.aggregate.js';
import type { Consent } from '../../domain/entities/consent.entity.js';
import type {
  InitiativeStageCatalogEntry,
  SectorCatalogEntry,
} from '../../domain/repositories/initiative-catalog.port.js';

/** A diagnostic's initiative profile as the API serves it, with its sector and stage named. */
export function toInitiativeProfileResponse(
  profile: InitiativeProfile,
  sector: SectorCatalogEntry,
  stage: InitiativeStageCatalogEntry,
): InitiativeProfileResponse {
  return {
    id: profile.id.value,
    initiativeId: profile.initiativeId.value,
    diagnosticId: profile.diagnosticId.value,
    name: profile.name,
    sector: { id: sector.id, name: sector.name },
    productType: profile.productType,
    stage: { id: stage.id, code: stage.code, name: stage.name },
    declaredStage: profile.declaredStage,
    teamSize: profile.teamSize,
    teamDescription: profile.teamDescription,
    targetMarket: profile.targetMarket,
    currentFunding: profile.currentFunding,
    recordedAt: profile.recordedAt.toISOString(),
  };
}

/** One acceptance of an initiative's consent, as the API serves it. */
export function toConsentRecord(consent: Consent): ConsentRecord {
  return {
    initiativeId: consent.initiativeId.value,
    version: consent.termsVersion,
    acceptedAt: consent.acceptedAt.toISOString(),
  };
}
