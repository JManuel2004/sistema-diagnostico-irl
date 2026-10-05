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
import { DiagnosticSummaryResponseDto } from './dto/diagnostic-summary.response.dto.js';

/**
 * `GET /api/v1/diagnostics` (HU-03, DIAGIRL-26): the caller's completed diagnostics.
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
    summary: 'List the caller’s completed diagnostics',
    description:
      'Only diagnostics with a maturity profile, most recent first, each with its initiative, ' +
      'when the profile was computed and its global level (HU-03, DIAGIRL-26). A diagnostic ' +
      'still being filled in is not listed.',
  })
  @ApiOkResponse({ type: [DiagnosticSummaryResponseDto] })
  @ApiErrors()
  listMyDiagnoses(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DiagnosticSummary[]> {
    return this.listMine.execute(user.id);
  }
}
