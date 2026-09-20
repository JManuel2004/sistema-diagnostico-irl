import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { InitiativeStage, Sector } from '@innlab/contracts';
import {
  ListSectorsUseCase,
  ListStagesUseCase,
} from '../../application/use-cases/list-initiative-catalog.use-case.js';

/**
 * Read-only catalogs the initiative registration form needs.
 *
 *   - `GET /api/v1/initiative-catalog/sectors`
 *   - `GET /api/v1/initiative-catalog/stages`
 */
@ApiTags('initiative')
@Controller('initiative-catalog')
export class InitiativeCatalogController {
  constructor(
    private readonly sectors: ListSectorsUseCase,
    private readonly stages: ListStagesUseCase,
  ) {}

  @Get('sectors')
  @ApiOkResponse({ description: 'Active sectors, by name' })
  listSectors(): Promise<Sector[]> {
    return this.sectors.execute();
  }

  @Get('stages')
  @ApiOkResponse({ description: 'Active initiative stages, in order' })
  listStages(): Promise<InitiativeStage[]> {
    return this.stages.execute();
  }
}
