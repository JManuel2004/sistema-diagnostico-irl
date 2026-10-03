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
import { RegisterInitiativeProfileUseCase } from '../../application/use-cases/register-initiative-profile.use-case.js';
import { GetInitiativeProfileUseCase } from '../../application/use-cases/get-initiative-profile.use-case.js';
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
    private readonly register: RegisterInitiativeProfileUseCase,
    private readonly get: GetInitiativeProfileUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Register (or correct) the initiative profile of the diagnostic',
    description:
      "The snapshot of the profile of one of the caller's initiatives for this diagnostic. " +
      "409 when the initiative's consent is not accepted at the current version, or once the " +
      'deep analysis is accepted (the profile is frozen). Registering it moves the diagnostic ' +
      'to `WITH_INITIATIVE` through `InitiativeRegisteredEvent` (HU-06, RF-04).',
  })
  @ApiCreatedResponse({ type: InitiativeResponseDto })
  @ApiErrors(403, 404, 409, 422)
  async registerInitiative(
    @Param() { id }: DiagnosticIdParam,
    @Body() body: RegisterInitiativeRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Initiative> {
    return unwrapResult(
      await this.register.execute({
        diagnosticId: id,
        userId: user.id,
        initiativeId: body.initiativeId,
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
  @ApiErrors(403, 404, 422)
  async getInitiative(
    @Param() { id }: DiagnosticIdParam,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Initiative> {
    return unwrapResult(await this.get.execute(id, user.id));
  }
}
