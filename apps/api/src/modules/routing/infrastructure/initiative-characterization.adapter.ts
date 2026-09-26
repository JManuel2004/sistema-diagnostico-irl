import { Injectable } from '@nestjs/common';
import type { Characterization } from '@innlab/contracts';
import type { InitiativeCharacterizationPort } from '../domain/repositories/initiative-characterization.port.js';
import { GetInitiativeCharacterizationUseCase } from '../../initiative/application/use-cases/get-initiative-characterization.use-case.js';
import { ListStagesUseCase } from '../../initiative/application/use-cases/list-initiative-catalog.use-case.js';

/**
 * Adapter over `initiative/`'s own read use case.
 *
 * Used to read `iniciativa`/`etapa_iniciativa`/`sector` directly — that
 * was the "no `InitiativeModule` exists yet" compromise the port's own
 * docstring already named and predicted the fix for. `initiative/` now
 * exists; this adapter just forwards to it.
 */
@Injectable()
export class InitiativeCharacterizationAdapter
  implements InitiativeCharacterizationPort
{
  constructor(
    private readonly getCharacterization: GetInitiativeCharacterizationUseCase,
    private readonly listStages: ListStagesUseCase,
  ) {}

  findByDiagnosticId(diagnosticId: string): Promise<Characterization> {
    return this.getCharacterization.execute(diagnosticId);
  }

  async findStageCodes(): Promise<ReadonlyMap<string, string>> {
    const stages = await this.listStages.execute();
    return new Map(stages.map((s) => [s.id, s.code] as const));
  }
}
