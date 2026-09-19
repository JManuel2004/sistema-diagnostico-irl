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
 * Superficie HTTP del enrutamiento al portafolio (RF-15).
 *
 * Solo lectura. La recomendación no se genera desde aquí: la calcula
 * `routing/` al reaccionar a `DeepAnalysisRequestedEvent`, que publica
 * `POST /diagnostics/:id/deep-analysis` (RF-11). El antiguo
 * `POST /diagnostics/:id/recommendation` se retiró en la Fase 5 (backlog
 * 14.3): ofrecía un camino de escritura paralelo que no pasaba por el
 * evento ni comprobaba el estado del diagnóstico.
 *
 * La traza va en su propia ruta porque su audiencia es el equipo de
 * INNLAB, no el líder de iniciativa.
 */
@ApiTags('recommendation')
@Controller('diagnostics/:id/recommendation')
export class RecommendationController {
  constructor(
    private readonly obtener: GetRecommendationUseCase,
    private readonly obtenerTraza: GetRecommendationTraceUseCase,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Recomendación de portafolio persistida' })
  async get(@Param('id') diagnosticId: string): Promise<RecommendationResponse> {
    return unwrapResult(await this.obtener.execute({ diagnosticId }));
  }

  @Get('trace')
  @ApiOkResponse({
    description: 'Traza por layers de la evaluación — audiencia INNLAB',
  })
  async getTrace(@Param('id') diagnosticId: string): Promise<LayerTraceResponse> {
    return unwrapResult(await this.obtenerTraza.execute({ diagnosticId }));
  }
}
