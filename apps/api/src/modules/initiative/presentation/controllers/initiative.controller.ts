import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Initiative } from '@innlab/contracts';
import { CurrentUser } from '../../../../shared/identity/presentation/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../../shared/identity/application/dtos/authenticated-user.js';
import { RegisterInitiativeUseCase } from '../../application/use-cases/register-initiative.use-case.js';
import { GetInitiativeUseCase } from '../../application/use-cases/get-initiative.use-case.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';
import { DiagnosticIdParam } from '../../../../shared/kernel/presentation/dto/diagnostic-id.param.js';
import { ApiErrors } from '../../../../shared/kernel/presentation/api-errors.decorator.js';
import { RegisterInitiativeRequestDto } from './dto/initiative.request.dto.js';
import { InitiativeResponseDto } from './dto/initiative.response.dto.js';

@ApiTags('initiative')
@ApiBearerAuth()
@Controller('diagnostics/:id/initiative')
export class InitiativeController {
  constructor(
    private readonly register: RegisterInitiativeUseCase,
    private readonly get: GetInitiativeUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Register (or update) the initiative profile',
    description:
      'Requires the consent (409 without it). Registering it moves the diagnostic to ' +
      '`WITH_INITIATIVE` through `InitiativeRegisteredEvent` (HU-06, RF-04).',
  })
  @ApiCreatedResponse({ type: InitiativeResponseDto })
  @ApiErrors(404, 409, 422)
  async registerInitiative(
    @Param() { id }: DiagnosticIdParam,
    @Body() body: RegisterInitiativeRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Initiative> {
    return unwrapResult(
      await this.register.execute({
        diagnosticId: id,
        userId: user.id,
        sectorId: body.sectorId,
        name: body.name,
        productType: body.productType,
        stageId: body.stageId,
        declaredStage: body.declaredStage,
        teamSize: body.teamSize,
        teamDescription: body.teamDescription,
        targetMarket: body.targetMarket,
        currentFunding: body.currentFunding,
      }),
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Read the initiative profile',
    description: '404 while the diagnostic has no registered initiative.',
  })
  @ApiOkResponse({ type: InitiativeResponseDto })
  @ApiErrors(404, 422)
  async getInitiative(@Param() { id }: DiagnosticIdParam): Promise<Initiative> {
    return unwrapResult(await this.get.execute(id));
  }
}
