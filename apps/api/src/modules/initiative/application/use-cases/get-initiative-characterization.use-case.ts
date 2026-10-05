import type { Characterization } from '@innlab/contracts';
import { type InitiativeProfileRepositoryPort } from '../../domain/repositories/initiative-profile.repository.port.js';
import { type InitiativeCatalogPort } from '../../domain/repositories/initiative-catalog.port.js';

const NO_CHARACTERIZATION: Characterization = {
  stage: null,
  sector: null,
  teamSize: null,
};

/**
 * `GetInitiativeCharacterizationUseCase` — the read `routing/` needs to
 * score a service against the initiative's situation, not only its IRL
 * profile (`routing/`'s `InitiativeCharacterizationPort`).
 *
 * It reads the diagnostic's snapshot of the initiative profile. The
 * empty characterization comes back only when the diagnostic has no
 * profile, which the wizard makes impossible before the deep analysis; the
 * routing engine treats `null` as "does not match" / "does not exclude"
 * and records it in the trace rather than failing.
 */
export class GetInitiativeCharacterizationUseCase {
  constructor(
    private readonly profiles: InitiativeProfileRepositoryPort,
    private readonly catalog: InitiativeCatalogPort,
  ) {}

  async execute(diagnosticId: string): Promise<Characterization> {
    const initiative = await this.profiles.findByDiagnosticId(diagnosticId);
    if (!initiative) return NO_CHARACTERIZATION;

    const [stage, sector] = await Promise.all([
      this.catalog.findStageById(initiative.stageId),
      this.catalog.findSectorById(initiative.sectorId),
    ]);

    return {
      stage: stage?.code ?? null,
      sector: sector?.name ?? null,
      teamSize: initiative.teamSize,
    };
  }
}
