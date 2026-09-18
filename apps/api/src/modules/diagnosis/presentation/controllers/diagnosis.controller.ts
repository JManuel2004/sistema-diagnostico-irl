import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { FinalizeInitialDiagnosisUseCase } from '../../application/use-cases/finalize-initial-diagnosis.use-case.js';
import type { MaturityProfileResponse } from '@innlab/contracts';

/**
 * HTTP surface for the diagnostic orchestrator.
 *
 * Routes that arrive with Stage 2 user stories:
 *   - `POST /api/v1/diagnostics`        (HU-04) — start a new diagnostic.
 *   - `GET  /api/v1/diagnostics`        (HU-03) — list the user's own.
 *   - `GET  /api/v1/diagnostics/:id`    — fetch a single diagnostic.
 *   - `POST /api/v1/diagnostics/:id/finalize-initial` — orchestrates
 *     `Questionnaire` + `MaturityProfile` (out of phase-1 scope).
 */
@ApiTags('diagnostics')
@Controller('diagnostics')
export class DiagnosisController {
  constructor(
    private readonly finalizeInitial: FinalizeInitialDiagnosisUseCase,
  ) {}

  @Post(':id/finalizar-inicial')
  @ApiCreatedResponse({
    description:
      'Cuestionario persistido, perfil calculado y diagnóstico en PROFILE_GENERATED',
  })
  finalize(
    @Param('id') diagnosticId: string,
    @Body() body: { answers: { statementId: string; value: number }[] },
  ): Promise<MaturityProfileResponse> {
    return this.finalizeInitial.execute({
      diagnosticId,
      answers: body.answers,
    });
  }
}
