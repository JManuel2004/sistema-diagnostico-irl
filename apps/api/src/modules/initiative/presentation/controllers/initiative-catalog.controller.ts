import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { InitiativeStage, Sector } from '@innlab/contracts';
import {
  ListSectorsUseCase,
  ListStagesUseCase,
} from '../../application/use-cases/list-initiative-catalog.use-case.js';
import { ApiErrors } from '../../../../shared/kernel/presentation/api-errors.decorator.js';
import {
  InitiativeStageResponseDto,
  SectorResponseDto,
} from './dto/initiative.response.dto.js';

@ApiTags('initiative')
@ApiBearerAuth()
@Controller('initiative-catalog')
export class InitiativeCatalogController {
  constructor(
    private readonly sectors: ListSectorsUseCase,
    private readonly stages: ListStagesUseCase,
  ) {}

  @Get('sectors')
  @ApiOperation({
    summary: 'List the sectors',
    description: 'Active sectors, by name.',
  })
  @ApiOkResponse({ type: [SectorResponseDto] })
  @ApiErrors()
  listSectors(): Promise<Sector[]> {
    return this.sectors.execute();
  }

  @Get('stages')
  @ApiOperation({
    summary: 'List the initiative stages',
    description: 'Active stages, in order.',
  })
  @ApiOkResponse({ type: [InitiativeStageResponseDto] })
  @ApiErrors()
  listStages(): Promise<InitiativeStage[]> {
    return this.stages.execute();
  }
}
