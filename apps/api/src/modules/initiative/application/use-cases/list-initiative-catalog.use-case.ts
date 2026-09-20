import { Inject, Injectable } from '@nestjs/common';
import type { InitiativeStage, Sector } from '@innlab/contracts';
import {
  INITIATIVE_CATALOG_REPOSITORY,
  type InitiativeCatalogPort,
} from '../../domain/repositories/initiative-catalog.port.js';

/** The sectors the registration form offers (`irl_catalog.sector`). */
@Injectable()
export class ListSectorsUseCase {
  constructor(
    @Inject(INITIATIVE_CATALOG_REPOSITORY)
    private readonly catalog: InitiativeCatalogPort,
  ) {}

  async execute(): Promise<Sector[]> {
    const sectors = await this.catalog.findAllSectors();
    return sectors.map((s) => ({ id: s.id, name: s.name }));
  }
}

/** The initiative stages the registration form offers, in their order. */
@Injectable()
export class ListStagesUseCase {
  constructor(
    @Inject(INITIATIVE_CATALOG_REPOSITORY)
    private readonly catalog: InitiativeCatalogPort,
  ) {}

  async execute(): Promise<InitiativeStage[]> {
    const stages = await this.catalog.findAllStages();
    return stages.map((s) => ({ id: s.id, code: s.code, name: s.name }));
  }
}
