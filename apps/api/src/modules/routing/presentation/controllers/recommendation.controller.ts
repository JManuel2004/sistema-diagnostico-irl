import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type {
  RecommendationResponse,
  LayerTraceResponse,
} from '@innlab/contracts';
import { GetRecommendationUseCase } from '../../application/use-cases/get-recommendation.use-case.js';
import { GetRecommendationTraceUseCase } from '../../application/use-cases/get-recommendation-trace.use-case.js';
import type { AuthenticatedUser } from '../../../../shared/identity/application/dtos/authenticated-user.js';
import { CurrentUser } from '../../../../shared/identity/presentation/decorators/current-user.decorator.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';
import { DiagnosticIdParam } from '../../../../shared/kernel/presentation/dto/diagnostic-id.param.js';
import { ApiErrors } from '../../../../shared/kernel/presentation/api-errors.decorator.js';
import {
  LayerTraceResponseDto,
  RecommendationResponseDto,
} from './dto/recommendation.response.dto.js';

/**
 * HTTP surface of the portfolio routing (RF-15).
 *
 * Read-only. The recommendation is not generated here: `routing/`
 * calculates it when it reacts to `DeepAnalysisRequestedEvent`, which
 * `POST /diagnostics/:id/deep-analysis` publishes (RF-11). The former
 * `POST /diagnostics/:id/recommendation` was retired: it offered a parallel
 * write path that neither went through the event nor checked the state of
 * the diagnostic.
 *
 * The trace has its own route because its audience is the INNLAB team, not
 * the initiative leader.
 */
@ApiTags('recommendation')
@ApiBearerAuth()
@Controller('diagnostics/:id/recommendation')
export class RecommendationController {
  constructor(
    private readonly getRecommendation: GetRecommendationUseCase,
    private readonly getRecommendationTrace: GetRecommendationTraceUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Read the portfolio recommendation',
    description:
      'The recommendation saved when the deep analysis was accepted (RF-15); 409 before that.',
  })
  @ApiOkResponse({ type: RecommendationResponseDto })
  @ApiErrors(404, 409, 422)
  async get(
    @Param() { id }: DiagnosticIdParam,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RecommendationResponse> {
    return unwrapResult(
      await this.getRecommendation.execute({ diagnosticId: id, userId: user.id }),
    );
  }

  @Get('trace')
  @ApiOperation({
    summary: 'Read the recommendation’s trace by layers',
    description:
      'What each layer of the engine did and why. Audience: the INNLAB team.',
  })
  @ApiOkResponse({ type: LayerTraceResponseDto })
  @ApiErrors(404, 409, 422)
  async getTrace(
    @Param() { id }: DiagnosticIdParam,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<LayerTraceResponse> {
    return unwrapResult(
      await this.getRecommendationTrace.execute({ diagnosticId: id, userId: user.id }),
    );
  }
}
