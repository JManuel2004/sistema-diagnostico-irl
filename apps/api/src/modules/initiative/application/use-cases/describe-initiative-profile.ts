import type { Initiative as InitiativeProfileResponse } from '@innlab/contracts';
import type { InitiativeProfile } from '../../domain/entities/initiative-profile.aggregate.js';
import { type InitiativeCatalogPort } from '../../domain/repositories/initiative-catalog.port.js';
import { toInitiativeProfileResponse } from '../dtos/map-initiative-response.js';

/**
 * A profile with its sector and stage named from the catalog, or `null` if
 * the catalog no longer has one of them (a broken catalog, not a user error).
 */
export async function describeInitiativeProfile(
  catalog: InitiativeCatalogPort,
  profile: InitiativeProfile,
): Promise<InitiativeProfileResponse | null> {
  const [sector, stage] = await Promise.all([
    catalog.findSectorById(profile.sectorId),
    catalog.findStageById(profile.stageId),
  ]);
  return sector && stage ? toInitiativeProfileResponse(profile, sector, stage) : null;
}
