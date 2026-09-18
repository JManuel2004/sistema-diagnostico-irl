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
import { Initiative } from '../../domain/entities/initiative.aggregate.js';
import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

export interface RegisterInitiativeCommand {
  diagnosticId: string;
  sectorId: string;
  name: string;
  // Required, not optional as `registerInitiativeSchema` in
  // `@innlab/contracts` currently declares it: the database column is
  // `NOT NULL` (`irl_diagnostic.initiative.short_description`), so an
  // omitted description was never actually possible to persist. Treated
  // as a pre-existing mismatch in an until-now-unused contract, not a
  // rule invented here — see the note on `initiativeSchema` in the
  // contracts package for the corresponding fix on that side.
  shortDescription: string;
}

/**
 * `RegisterInitiativeUseCase` (RF-04 / HU-06).
 *
 * Registering twice for the same diagnostic replaces the previous
 * record — `InitiativeRepositoryPort.save` upserts by `diagnosticId`,
 * there is no separate "update" use case.
 *
 * An unknown `sectorId` is a normal, expected outcome — the client sent
 * a stale or invalid catalog id — not an exceptional condition
 * (`convenciones-objetivo.md` §2, "Adopción de Result<T, E>").
 */
@Injectable()
export class RegisterInitiativeUseCase {
  constructor(
    @Inject(INITIATIVE_REPOSITORY)
    private readonly initiatives: InitiativeRepositoryPort,
    @Inject(INITIATIVE_CATALOG_REPOSITORY)
    private readonly catalog: InitiativeCatalogPort,
  ) {}

  async execute(
    cmd: RegisterInitiativeCommand,
  ): Promise<Result<InitiativeResponse, NotFoundError>> {
    const sector = await this.catalog.findSectorById(cmd.sectorId);
    if (!sector) {
      return Result.err(new NotFoundError('Sector', cmd.sectorId));
    }

    const diagnosticId = Uuid.create(cmd.diagnosticId);
    const initiative = Initiative.register({
      id: Uuid.generate(),
      diagnosticId,
      sectorId: cmd.sectorId,
      name: cmd.name,
      shortDescription: cmd.shortDescription,
    });

    await this.initiatives.save(initiative);

    return Result.ok({
      id: initiative.id.value,
      diagnosticId: initiative.diagnosticId.value,
      name: initiative.name,
      sector: { id: sector.id, name: sector.name },
      description: initiative.shortDescription,
    });
  }
}
