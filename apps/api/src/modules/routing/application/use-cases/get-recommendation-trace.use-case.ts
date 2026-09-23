import { Inject, Injectable } from '@nestjs/common';
import type { LayerTraceResponse } from '@innlab/contracts';
import {
  RECOMMENDATION_REPOSITORY,
  type RecommendationRepositoryPort,
} from '../../domain/repositories/recommendation.repository.port.js';
import { RecommendationNotGeneratedError } from '../../domain/exceptions/routing.errors.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import { toTrazaCapasResponse } from '../dtos/map-recommendation-response.js';

export interface GetRecommendationTraceQuery {
  diagnosticId: string;
}

/**
 * Devuelve la traza por capas. Caso de uso separado del anterior a
 * propósito: son dos audiencias con necesidades distintas, y tenerlos
 * separados permite que la autorización los trate distinto cuando exista
 * el módulo de identidad.
 *
 * "Todavía no generada" es una salida normal y esperada, no una condición
 * excepcional.
 */
@Injectable()
export class GetRecommendationTraceUseCase {
  constructor(
    @Inject(RECOMMENDATION_REPOSITORY)
    private readonly recommendations: RecommendationRepositoryPort,
  ) {}

  async execute(
    query: GetRecommendationTraceQuery,
  ): Promise<Result<LayerTraceResponse, RecommendationNotGeneratedError>> {
    const recommendation = await this.recommendations.findByDiagnosticId(
      query.diagnosticId,
    );
    if (!recommendation) {
      return Result.err(new RecommendationNotGeneratedError(query.diagnosticId));
    }

    return Result.ok(toTrazaCapasResponse(recommendation));
  }
}
