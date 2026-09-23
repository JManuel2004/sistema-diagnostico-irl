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
import { toInitiativeResponse } from '../dtos/map-initiative-response.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

/**
 * "No initiative registered yet" is a normal, expected outcome, not an
 * exceptional condition.
 */
@Injectable()
export class GetInitiativeUseCase {
  constructor(
    @Inject(INITIATIVE_REPOSITORY)
    private readonly initiatives: InitiativeRepositoryPort,
    @Inject(INITIATIVE_CATALOG_REPOSITORY)
    private readonly catalog: InitiativeCatalogPort,
  ) {}

  async execute(diagnosticId: string): Promise<Result<InitiativeResponse, NotFoundError>> {
    const initiative = await this.initiatives.findByDiagnosticId(diagnosticId);
    if (!initiative) {
      return Result.err(new NotFoundError('Initiative', diagnosticId));
    }

    const [sector, stage] = await Promise.all([
      this.catalog.findSectorById(initiative.sectorId),
      initiative.stageId === null
        ? Promise.resolve(null)
        : this.catalog.findStageById(initiative.stageId),
    ]);
    if (!sector || !stage) {
      return Result.err(new NotFoundError('Initiative catalog entry', diagnosticId));
    }

    return Result.ok(toInitiativeResponse(initiative, sector, stage));
  }
}
