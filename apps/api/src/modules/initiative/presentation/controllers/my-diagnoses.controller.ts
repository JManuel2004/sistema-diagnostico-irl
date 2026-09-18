import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { DiagnosticSummary } from '@innlab/contracts';
import { CurrentUser } from '../../../../shared/identity/infrastructure/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../../shared/identity/domain/entities/authenticated-user.vo.js';
import { ListMyDiagnosesUseCase } from '../../application/use-cases/list-my-diagnoses.use-case.js';

/**
 * `GET /api/v1/diagnostics` (HU-03 — backlog 11.3).
 *
 * Kept as its own controller in `initiative/` rather than added to
 * `DiagnosisController` (which owns the rest of `/diagnostics`) to
 * avoid a circular module dependency: `initiative/` already depends on
 * `diagnosis/` for `DIAGNOSIS_REPOSITORY`, so `diagnosis/`'s own
 * controller cannot depend back on a use case from `initiative/`.
 */
@ApiTags('diagnostics')
@Controller('diagnostics')
export class MyDiagnosesController {
  constructor(private readonly listMine: ListMyDiagnosesUseCase) {}

  @Get()
  @ApiOkResponse({ description: "The caller's own diagnostics, most recent first" })
  listMyDiagnoses(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DiagnosticSummary[]> {
    return this.listMine.execute(user.id);
  }
}
