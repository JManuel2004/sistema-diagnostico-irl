import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { DiagnosticSummary } from '@innlab/contracts';
import { CurrentUser } from '../../../../shared/identity/presentation/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../../shared/identity/application/dtos/authenticated-user.js';
import { ListMyDiagnosesUseCase } from '../../application/use-cases/list-my-diagnoses.use-case.js';
import { ApiErrors } from '../../../../shared/kernel/presentation/api-errors.decorator.js';
import { DiagnosticResponseDto } from '../../../diagnosis/presentation/controllers/dto/diagnosis.response.dto.js';

/**
 * `GET /api/v1/diagnostics` (HU-03).
 *
 * Kept as its own controller in `initiative/` rather than added to
 * `DiagnosisController` (which owns the rest of `/diagnostics`) to
 * avoid a circular module dependency: `initiative/` already depends on
 * `diagnosis/` for its exported read queries, so `diagnosis/`'s own
 * controller cannot depend back on a use case from `initiative/`.
 */
@ApiTags('diagnostics')
@ApiBearerAuth()
@Controller('diagnostics')
export class MyDiagnosesController {
  constructor(private readonly listMine: ListMyDiagnosesUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'List the caller’s diagnostics',
    description: 'Most recent first (HU-03).',
  })
  @ApiOkResponse({ type: [DiagnosticResponseDto] })
  @ApiErrors()
  listMyDiagnoses(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DiagnosticSummary[]> {
    return this.listMine.execute(user.id);
  }
}
