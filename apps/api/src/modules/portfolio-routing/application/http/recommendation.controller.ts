import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type {
  RecommendationResponse,
  LayerTraceResponse,
} from '@innlab/contracts';
import { GenerateRecommendationUseCase } from '../../usecase/generate-recommendation.use-case.js';
import { GetRecommendationUseCase } from '../../usecase/get-recommendation.use-case.js';
import { GetRecommendationTraceUseCase } from '../../usecase/get-recommendation-trace.use-case.js';

/**
 * Superficie HTTP del enrutamiento al portafolio (RF-15).
 *
 * La generación es `POST` sobre un subrecurso, en línea con
 * `POST /diagnostics/:id/finalize-initial`. Deliberadamente NO se
 * integra dentro de ese endpoint: `finalizar-inicial` cierra la fase 1
 * (perfil de madurez) y la recomendación pertenece al análisis profundo,
 * que es un momento distinto del recorrido y una decisión que el usuario
 * toma por separado (RF-11).
 *
 * La traza va en su propia ruta porque su audiencia es el equipo de
 * INNLAB, no el líder de iniciativa.
 */
@ApiTags('recommendation')
@Controller('diagnostics/:id/recommendation')
export class RecommendationController {
  constructor(
    private readonly generar: GenerateRecommendationUseCase,
    private readonly obtener: GetRecommendationUseCase,
    private readonly obtenerTraza: GetRecommendationTraceUseCase,
  ) {}

  @Post()
  @ApiCreatedResponse({
    description:
      'Recomendación de portafolio generada y persistida junto con su trace por layers',
  })
  generate(@Param('id') diagnosticId: string): Promise<RecommendationResponse> {
    return this.generar.execute({ diagnosticId });
  }

  @Get()
  @ApiOkResponse({ description: 'Recomendación de portafolio persistida' })
  get(@Param('id') diagnosticId: string): Promise<RecommendationResponse> {
    return this.obtener.execute({ diagnosticId });
  }

  @Get('trace')
  @ApiOkResponse({
    description: 'Traza por layers de la evaluación — audiencia INNLAB',
  })
  getTrace(@Param('id') diagnosticId: string): Promise<LayerTraceResponse> {
    return this.obtenerTraza.execute({ diagnosticId });
  }
}
