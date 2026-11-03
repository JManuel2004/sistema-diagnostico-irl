import type { InitiativeStage, SectorOption } from '@innlab/contracts';
import { type InitiativeCatalogPort } from '../../domain/repositories/initiative-catalog.port.js';
import { toSector } from '../dtos/map-initiative-response.js';

/**
 * The sectors the registration form offers (`irl_catalog.sector`): the CIIU
 * sections by code, with what each groups and the words to search them
 * by, and «Otro» last.
 */
export class ListSectorsUseCase {
  constructor(private readonly catalog: InitiativeCatalogPort) {}

  async execute(): Promise<SectorOption[]> {
    const sectors = await this.catalog.findAllSectors();
    return sectors.map((s) => ({
      ...toSector(s),
      description: s.description,
      keywords: [...s.keywords],
    }));
  }
}

/** The initiative stages the registration form offers, in their order. */
export class ListStagesUseCase {
  constructor(private readonly catalog: InitiativeCatalogPort) {}

  async execute(): Promise<InitiativeStage[]> {
    const stages = await this.catalog.findAllStages();
    return stages.map((s) => ({ id: s.id, code: s.code, name: s.name }));
  }
}
