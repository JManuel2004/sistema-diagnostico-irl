import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type {
  RecomendacionResponse,
  TrazaCapasResponse,
} from '@innlab/contracts';
import { GenerateRecommendationUseCase } from '../../application/generate-recommendation.use-case.js';
import { GetRecommendationUseCase } from '../../application/get-recommendation.use-case.js';
import { GetRecommendationTraceUseCase } from '../../application/get-recommendation-trace.use-case.js';

/**
 * Superficie HTTP del enrutamiento al portafolio (RF-15).
 *
 * La generación es `POST` sobre un subrecurso, en línea con
 * `POST /diagnosticos/:id/finalizar-inicial`. Deliberadamente NO se
 * integra dentro de ese endpoint: `finalizar-inicial` cierra la fase 1
 * (perfil de madurez) y la recomendación pertenece al análisis profundo,
 * que es un momento distinto del recorrido y una decisión que el usuario
 * toma por separado (RF-11).
 *
 * La traza va en su propia ruta porque su audiencia es el equipo de
 * INNLAB, no el líder de iniciativa.
 */
@ApiTags('recomendacion')
@Controller('diagnosticos/:id/recomendacion')
export class RecomendacionController {
  constructor(
    private readonly generar: GenerateRecommendationUseCase,
    private readonly obtener: GetRecommendationUseCase,
    private readonly obtenerTraza: GetRecommendationTraceUseCase,
  ) {}

  @Post()
  @ApiCreatedResponse({
    description:
      'Recomendación de portafolio generada y persistida junto con su traza por capas',
  })
  generate(@Param('id') diagnosticId: string): Promise<RecomendacionResponse> {
    return this.generar.execute({ diagnosticId });
  }

  @Get()
  @ApiOkResponse({ description: 'Recomendación de portafolio persistida' })
  get(@Param('id') diagnosticId: string): Promise<RecomendacionResponse> {
    return this.obtener.execute({ diagnosticId });
  }

  @Get('traza')
  @ApiOkResponse({
    description: 'Traza por capas de la evaluación — audiencia INNLAB',
  })
  getTrace(@Param('id') diagnosticId: string): Promise<TrazaCapasResponse> {
    return this.obtenerTraza.execute({ diagnosticId });
  }
}
