import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { InitiativeStage, SectorOption } from '@innlab/contracts';
import {
  ListSectorsUseCase,
  ListStagesUseCase,
} from '../../application/use-cases/list-initiative-catalog.use-case.js';
import { ApiErrors } from '../../../../shared/kernel/presentation/api-errors.decorator.js';
import {
  InitiativeStageResponseDto,
  SectorOptionResponseDto,
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
    description:
      'Active sectors: the sections of the CIIU Rev. 5 A.C. by code, with the words to search them by, and «Otro sector (especificar)» last.',
  })
  @ApiOkResponse({ type: [SectorOptionResponseDto] })
  @ApiErrors()
  listSectors(): Promise<SectorOption[]> {
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
