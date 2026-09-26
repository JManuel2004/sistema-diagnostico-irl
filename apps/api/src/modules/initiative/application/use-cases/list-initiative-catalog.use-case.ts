import type { InitiativeStage, Sector } from '@innlab/contracts';
import { type InitiativeCatalogPort } from '../../domain/repositories/initiative-catalog.port.js';

/** The sectors the registration form offers (`irl_catalog.sector`). */
export class ListSectorsUseCase {
  constructor(private readonly catalog: InitiativeCatalogPort) {}

  async execute(): Promise<Sector[]> {
    const sectors = await this.catalog.findAllSectors();
    return sectors.map((s) => ({ id: s.id, name: s.name }));
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
