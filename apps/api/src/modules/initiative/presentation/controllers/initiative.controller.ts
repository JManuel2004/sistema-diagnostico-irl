import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type {
  Initiative as InitiativeResponse,
  RegisterInitiativeCommand,
} from '@innlab/contracts';
import { CurrentUser } from '../../../../shared/identity/presentation/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../../shared/identity/application/dtos/authenticated-user.js';
import { RegisterInitiativeUseCase } from '../../application/use-cases/register-initiative.use-case.js';
import { GetInitiativeUseCase } from '../../application/use-cases/get-initiative.use-case.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';

/**
 * HTTP surface for the initiative profile (RF-04 / HU-06).
 *
 * Routes:
 *   - `POST /api/v1/diagnostics/:id/initiative` — register.
 *   - `GET  /api/v1/diagnostics/:id/initiative` — read back.
 */
@ApiTags('initiative')
@Controller('diagnostics/:id/initiative')
export class InitiativeController {
  constructor(
    private readonly register: RegisterInitiativeUseCase,
    private readonly get: GetInitiativeUseCase,
  ) {}

  @Post()
  @ApiCreatedResponse({ description: 'Initiative registered for this diagnostic' })
  async registerInitiative(
    @Param('id') diagnosticId: string,
    @Body() body: RegisterInitiativeCommand,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<InitiativeResponse> {
    return unwrapResult(
      await this.register.execute({
        diagnosticId,
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
  @ApiOkResponse({ description: 'Initiative registered for this diagnostic' })
  async getInitiative(@Param('id') diagnosticId: string): Promise<InitiativeResponse> {
    return unwrapResult(await this.get.execute(diagnosticId));
  }
}
