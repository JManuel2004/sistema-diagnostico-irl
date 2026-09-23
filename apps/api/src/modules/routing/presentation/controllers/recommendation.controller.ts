import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type {
  RecommendationResponse,
  LayerTraceResponse,
} from '@innlab/contracts';
import { GetRecommendationUseCase } from '../../application/use-cases/get-recommendation.use-case.js';
import { GetRecommendationTraceUseCase } from '../../application/use-cases/get-recommendation-trace.use-case.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';

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
@Controller('diagnostics/:id/recommendation')
export class RecommendationController {
  constructor(
    private readonly getRecommendation: GetRecommendationUseCase,
    private readonly getRecommendationTrace: GetRecommendationTraceUseCase,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Persisted portfolio recommendation' })
  async get(@Param('id') diagnosticId: string): Promise<RecommendationResponse> {
    return unwrapResult(await this.getRecommendation.execute({ diagnosticId }));
  }

  @Get('trace')
  @ApiOkResponse({
    description: 'Trace by layers of the evaluation — INNLAB audience',
  })
  async getTrace(@Param('id') diagnosticId: string): Promise<LayerTraceResponse> {
    return unwrapResult(await this.getRecommendationTrace.execute({ diagnosticId }));
  }
}
