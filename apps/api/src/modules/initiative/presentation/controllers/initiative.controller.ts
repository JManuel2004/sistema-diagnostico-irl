import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Initiative as InitiativeResponse } from '@innlab/contracts';
import { RegisterInitiativeUseCase } from '../../application/use-cases/register-initiative.use-case.js';
import { GetInitiativeUseCase } from '../../application/use-cases/get-initiative.use-case.js';

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
  registerInitiative(
    @Param('id') diagnosticId: string,
    @Body() body: { sectorId: string; name: string; shortDescription: string },
  ): Promise<InitiativeResponse> {
    return this.register.execute({
      diagnosticId,
      sectorId: body.sectorId,
      name: body.name,
      shortDescription: body.shortDescription,
    });
  }

  @Get()
  @ApiOkResponse({ description: 'Initiative registered for this diagnostic' })
  getInitiative(@Param('id') diagnosticId: string): Promise<InitiativeResponse> {
    return this.get.execute(diagnosticId);
  }
}
