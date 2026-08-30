import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { FinalizeInitialDiagnosticUseCase } from '../../application/finalize-initial-diagnostic.use-case.js';
import type { MaturityProfileResponse } from '@innlab/contracts';

/**
 * HTTP surface for the diagnostic orchestrator.
 *
 * `POST /api/v1/diagnosticos/:id/finalizar-inicial` composes
 * questionnaire submission + maturity-profile calculation + state
 * transitions. Other write endpoints (list/start) land with later HUs.
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
    @Body() body: { answers: Array<{ statementId: string; value: number }> },
  ): Promise<MaturityProfileResponse> {
    return this.finalizeInitial.execute({
      diagnosticId,
      answers: body.answers,
    });
  }
}
