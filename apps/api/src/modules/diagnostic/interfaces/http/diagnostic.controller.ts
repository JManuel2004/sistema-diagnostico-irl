import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { FinalizeInitialDiagnosticUseCase } from '../../application/finalize-initial-diagnostic.use-case.js';
import type { MaturityProfileResponse } from '@innlab/contracts';

/**
 * HTTP surface for the diagnostic orchestrator.
 *
 * Routes that arrive with Stage 2 user stories:
 *   - `POST /api/v1/diagnosticos`        (HU-04) — start a new diagnostic.
 *   - `GET  /api/v1/diagnosticos`        (HU-03) — list the user's own.
 *   - `GET  /api/v1/diagnosticos/:id`    — fetch a single diagnostic.
 *   - `POST /api/v1/diagnosticos/:id/finalizar-inicial` — orchestrates
 *     `Questionnaire` + `MaturityProfile` (out of phase-1 scope).
 */
@ApiTags('diagnosticos')
@Controller('diagnosticos')
export class DiagnosticController {
  constructor(
    private readonly finalizeInitial: FinalizeInitialDiagnosticUseCase,
  ) {}

  @Post(':id/finalizar-inicial')
  @ApiCreatedResponse({
    description:
      'Cuestionario persistido, perfil calculado y diagnóstico en PERFIL_GENERADO',
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
