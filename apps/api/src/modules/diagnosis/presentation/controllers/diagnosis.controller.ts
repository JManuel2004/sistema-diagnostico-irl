import { Controller, Body, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { FinalizeInitialDiagnosisUseCase } from '../../application/use-cases/finalize-initial-diagnosis.use-case.js';
import { GetDiagnosisUseCase } from '../../application/use-cases/get-diagnosis.use-case.js';
import { StartDiagnosisUseCase } from '../../application/use-cases/start-diagnosis.use-case.js';
import { CurrentUser } from '../../../../shared/identity/presentation/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../../shared/identity/application/dtos/authenticated-user.js';
import { RequestDeepAnalysisUseCase } from '../../application/use-cases/request-deep-analysis.use-case.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';
import type {
  Diagnostic,
  MaturityProfileResponse,
  AcceptDeepAnalysisResponse,
} from '@innlab/contracts';

/**
 * HTTP surface for the diagnostic orchestrator.
 *
 * Routes:
 *   - `POST /api/v1/diagnostics`        (HU-04) — start a diagnostic, or resume
 *     the user's unfinished one (idempotent).
 *
 * Routes that arrive with later user stories:
 *   - `GET  /api/v1/diagnostics`        (HU-03) — list the user's own
 *     (served by `initiative/`'s `MyDiagnosesController`).
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
    private readonly startDiagnosis: StartDiagnosisUseCase,
    private readonly getDiagnosis: GetDiagnosisUseCase,
  ) {}

  @Post()
  @ApiCreatedResponse({
    description:
      'Diagnóstico del usuario autenticado: el que tenga sin terminar (se reanuda) o, si no ' +
      'tiene ninguno, uno nuevo en STARTED',
  })
  start(@CurrentUser() user: AuthenticatedUser): Promise<Diagnostic> {
    return this.startDiagnosis.execute({ userId: user.id });
  }

  @Get(':id')
  @ApiOkResponse({
    description:
      'Diagnóstico del usuario autenticado, con su estado y si aceptó el análisis profundo',
  })
  async get(
    @Param('id') diagnosticId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Diagnostic> {
    return unwrapResult(await this.getDiagnosis.execute({ diagnosticId, userId: user.id }));
  }

  @Post(':id/finalize-initial')
  @ApiCreatedResponse({
    description:
      'Cuestionario persistido, perfil calculado y diagnóstico en PROFILE_GENERATED',
  })
  async finalize(
    @Param('id') diagnosticId: string,
    @Body()
    body: { answers: { statementId: string; value: number; justification: string }[] },
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
