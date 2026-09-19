import { Controller, Body, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { FinalizeInitialDiagnosisUseCase } from '../../application/use-cases/finalize-initial-diagnosis.use-case.js';
import { RequestDeepAnalysisUseCase } from '../../application/use-cases/request-deep-analysis.use-case.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';
import type {
  MaturityProfileResponse,
  AcceptDeepAnalysisResponse,
} from '@innlab/contracts';

/**
 * HTTP surface for the diagnostic orchestrator.
 *
 * Routes that arrive with Stage 2 user stories:
 *   - `POST /api/v1/diagnostics`        (HU-04) — start a new diagnostic.
 *   - `GET  /api/v1/diagnostics`        (HU-03) — list the user's own.
 *   - `GET  /api/v1/diagnostics/:id`    — fetch a single diagnostic.
 *   - `POST /api/v1/diagnostics/:id/finalize-initial` — orchestrates
 *     `Questionnaire` + `MaturityProfile` (out of phase-1 scope).
 *   - `POST /api/v1/diagnostics/:id/deep-analysis` (RF-11) — accepts
 *     deep analysis; fires `DeepAnalysisRequestedEvent` for `routing/`
 *     and `roadmap/` to react to independently.
 */
@ApiTags('diagnostics')
@Controller('diagnostics')
export class DiagnosisController {
  constructor(
    private readonly finalizeInitial: FinalizeInitialDiagnosisUseCase,
    private readonly requestDeepAnalysis: RequestDeepAnalysisUseCase,
  ) {}

  @Post(':id/finalizar-inicial')
  @ApiCreatedResponse({
    description:
      'Cuestionario persistido, perfil calculado y diagnóstico en PROFILE_GENERATED',
  })
  async finalize(
    @Param('id') diagnosticId: string,
    @Body() body: { answers: { statementId: string; value: number }[] },
  ): Promise<MaturityProfileResponse> {
    return unwrapResult(
      await this.finalizeInitial.execute({
        diagnosticId,
        answers: body.answers,
      }),
    );
  }

  @Post(':id/deep-analysis')
  @ApiCreatedResponse({
    description:
      'Análisis profundo aceptado — diagnóstico en DEEP_ANALYSIS_IN_PROGRESS. ' +
      'Idempotente si ya estaba aceptado.',
  })
  async requestDeepAnalysisFor(
    @Param('id') diagnosticId: string,
  ): Promise<AcceptDeepAnalysisResponse> {
    return unwrapResult(
      await this.requestDeepAnalysis.execute({ diagnosticId }),
    );
  }
}
