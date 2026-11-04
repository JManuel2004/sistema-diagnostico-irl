import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type {
  AcceptDeepAnalysisResponse,
  Diagnostic,
  MaturityProfileResponse,
} from '@innlab/contracts';
import { FinalizeInitialDiagnosisUseCase } from '../../application/use-cases/finalize-initial-diagnosis.use-case.js';
import { GetDiagnosisUseCase } from '../../application/use-cases/get-diagnosis.use-case.js';
import { StartDiagnosisUseCase } from '../../application/use-cases/start-diagnosis.use-case.js';
import { GetInProgressDiagnosisQuery } from '../../application/use-cases/get-in-progress-diagnosis.query.js';
import { RequestDeepAnalysisUseCase } from '../../application/use-cases/request-deep-analysis.use-case.js';
import { CurrentUser } from '../../../../shared/identity/presentation/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../../shared/identity/application/dtos/authenticated-user.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';
import { DiagnosticIdParam } from '../../../../shared/kernel/presentation/dto/diagnostic-id.param.js';
import { ApiErrors } from '../../../../shared/kernel/presentation/api-errors.decorator.js';
import { AnswersRequestDto } from './dto/answers.request.dto.js';
import { StartDiagnosisQuery } from './dto/start-diagnosis.query.js';
import {
  AcceptDeepAnalysisResponseDto,
  DiagnosticResponseDto,
  MaturityProfileResponseDto,
} from './dto/diagnosis.response.dto.js';

@ApiTags('diagnostics')
@ApiBearerAuth()
@Controller('diagnostics')
export class DiagnosisController {
  constructor(
    private readonly finalizeInitial: FinalizeInitialDiagnosisUseCase,
    private readonly requestDeepAnalysis: RequestDeepAnalysisUseCase,
    private readonly startDiagnosis: StartDiagnosisUseCase,
    private readonly getDiagnosis: GetDiagnosisUseCase,
    private readonly getInProgress: GetInProgressDiagnosisQuery,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Start a new diagnostic',
    description:
      'Creates a new diagnostic in `STARTED`; completed ones stay (HU-04, DIAGIRL-26). An ' +
      'unfinished one keeps its draft and is continued from any session, so while the caller ' +
      'has one this answers 409 `DIAGNOSIS_IN_PROGRESS`. With `discardInProgress=true` the ' +
      'unfinished ones are deleted first, with their draft.',
  })
  @ApiCreatedResponse({ type: DiagnosticResponseDto })
  @ApiErrors(409, 422)
  async start(
    @Query() { discardInProgress }: StartDiagnosisQuery,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Diagnostic> {
    return unwrapResult(
      await this.startDiagnosis.execute({
        userId: user.id,
        discardInProgress: discardInProgress === 'true',
      }),
    );
  }

  // Declared before `:id` so the literal segment is not read as an id.
  @Get('in-progress')
  @ApiOperation({
    summary: 'Read the caller’s diagnostic in progress',
    description:
      'The most recently started diagnostic without a maturity profile yet; 404 when there is ' +
      'none. The panel offers to continue it from any session.',
  })
  @ApiOkResponse({ type: DiagnosticResponseDto })
  @ApiErrors(404)
  async inProgress(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Diagnostic> {
    return unwrapResult(await this.getInProgress.execute(user.id));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Read one of the caller’s diagnostics',
    description:
      'With `completed`, `deepAnalysisAccepted` and `deepAnalysisCompleted`, derived from ' +
      'the state. A foreign ' +
      'diagnostic answers 404, like a missing one, so its id does not leak.',
  })
  @ApiOkResponse({ type: DiagnosticResponseDto })
  @ApiErrors(404, 422)
  async get(
    @Param() { id }: DiagnosticIdParam,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Diagnostic> {
    return unwrapResult(
      await this.getDiagnosis.execute({ diagnosticId: id, userId: user.id }),
    );
  }

  @Post(':id/finalize-initial')
  @ApiOperation({
    summary: 'Process the questionnaire',
    description:
      'Saves the 48 answers with their optional justifications, computes the maturity profile and ' +
      'moves the diagnostic to `PROFILE_GENERATED` (RF-06, RF-07). Requires the initiative.',
  })
  @ApiCreatedResponse({ type: MaturityProfileResponseDto })
  @ApiErrors(404, 409, 422)
  async finalize(
    @Param() { id }: DiagnosticIdParam,
    @Body() body: AnswersRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MaturityProfileResponse> {
    return unwrapResult(
      await this.finalizeInitial.execute({
        diagnosticId: id,
        userId: user.id,
        answers: body.answers,
      }),
    );
  }

  @Post(':id/deep-analysis')
  @ApiOperation({
    summary: 'Accept the deep analysis',
    description:
      'Moves the diagnostic to `DEEP_ANALYSIS_IN_PROGRESS` and publishes ' +
      '`DeepAnalysisRequestedEvent`; the recommendation and the roadmap are calculated and ' +
      'saved before the response. Idempotent in the state: repeating it retries a failed ' +
      'calculation (RF-11).',
  })
  @ApiCreatedResponse({ type: AcceptDeepAnalysisResponseDto })
  @ApiErrors(404, 409, 422)
  async requestDeepAnalysisFor(
    @Param() { id }: DiagnosticIdParam,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AcceptDeepAnalysisResponse> {
    return unwrapResult(
      await this.requestDeepAnalysis.execute({
        diagnosticId: id,
        userId: user.id,
      }),
    );
  }
}
