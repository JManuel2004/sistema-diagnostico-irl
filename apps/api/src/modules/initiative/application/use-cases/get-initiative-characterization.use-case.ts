import type { Characterization } from '@innlab/contracts';
import { type InitiativeRepositoryPort } from '../../domain/repositories/initiative.repository.port.js';
import { type InitiativeCatalogPort } from '../../domain/repositories/initiative-catalog.port.js';

const NO_CHARACTERIZATION: Characterization = {
  stage: null,
  sector: null,
  teamSize: null,
  academicLinkage: null,
};

/**
 * `GetInitiativeCharacterizationUseCase` — the read `routing/` needs to
 * score a service against the initiative's situation, not only its IRL
 * profile (`routing/`'s `InitiativeCharacterizationPort`).
 *
 * Returns the empty characterization when no initiative is registered
 * for the diagnostic, which is still always true in practice: the
 * routing engine treats `null` as "does not match" / "does not
 * exclude" and records that in the trace rather than failing.
 *
 * This replaces `TypeOrmInitiativeCharacterizationRepository`'s direct
 * reads of `IniciativaOrm`/`EtapaIniciativaOrm`/`SectorOrm` — those
 * entities are gone (renamed and moved here);
 * `routing/` now calls this use case instead of reaching into
 * `initiative/`'s tables itself.
 */
export class GetInitiativeCharacterizationUseCase {
  constructor(
    private readonly initiatives: InitiativeRepositoryPort,
    private readonly catalog: InitiativeCatalogPort,
  ) {}

  async execute(diagnosticId: string): Promise<Characterization> {
    const initiative = await this.initiatives.findByDiagnosticId(diagnosticId);
    if (!initiative) return NO_CHARACTERIZATION;

    const [stage, sector] = await Promise.all([
      initiative.stageId === null
        ? null
        : this.catalog.findStageById(initiative.stageId),
      this.catalog.findSectorById(initiative.sectorId),
    ]);

    return {
      stage: stage?.code ?? null,
      sector: sector?.name ?? null,
      teamSize: initiative.teamSize,
      academicLinkage: initiative.academicLinkage,
    };
  }
}
