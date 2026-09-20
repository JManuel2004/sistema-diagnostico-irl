import type { Initiative as InitiativeResponse } from '@innlab/contracts';
import type { Initiative } from '../../domain/entities/initiative.aggregate.js';
import type {
  InitiativeStageCatalogEntry,
  SectorCatalogEntry,
} from '../../domain/repositories/initiative-catalog.port.js';

/** The initiative as the API serves it, with its sector and stage named. */
export function toInitiativeResponse(
  initiative: Initiative,
  sector: SectorCatalogEntry,
  stage: InitiativeStageCatalogEntry,
): InitiativeResponse {
  return {
    id: initiative.id.value,
    diagnosticId: initiative.diagnosticId.value,
    name: initiative.name,
    sector: { id: sector.id, name: sector.name },
    productType: initiative.productType,
    stage: { id: stage.id, code: stage.code, name: stage.name },
    declaredStage: initiative.declaredStage,
    teamSize: initiative.teamSize ?? 1,
    teamDescription: initiative.teamDescription,
    targetMarket: initiative.targetMarket,
    currentFunding: initiative.currentFunding,
  };
}
