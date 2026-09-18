import { Inject, Injectable } from '@nestjs/common';
import type { Initiative as InitiativeResponse } from '@innlab/contracts';
import {
  INITIATIVE_REPOSITORY,
  type InitiativeRepositoryPort,
} from '../../domain/repositories/initiative.repository.port.js';
import {
  INITIATIVE_CATALOG_REPOSITORY,
  type InitiativeCatalogPort,
} from '../../domain/repositories/initiative-catalog.port.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';

@Injectable()
export class GetInitiativeUseCase {
  constructor(
    @Inject(INITIATIVE_REPOSITORY)
    private readonly initiatives: InitiativeRepositoryPort,
    @Inject(INITIATIVE_CATALOG_REPOSITORY)
    private readonly catalog: InitiativeCatalogPort,
  ) {}

  async execute(diagnosticId: string): Promise<InitiativeResponse> {
    const initiative = await this.initiatives.findByDiagnosticId(diagnosticId);
    if (!initiative) {
      throw new NotFoundError('Initiative', diagnosticId);
    }

    const sector = await this.catalog.findSectorById(initiative.sectorId);

    return {
      id: initiative.id.value,
      diagnosticId: initiative.diagnosticId.value,
      name: initiative.name,
      sector: sector ?? { id: initiative.sectorId, name: '' },
      description: initiative.shortDescription,
    };
  }
}
