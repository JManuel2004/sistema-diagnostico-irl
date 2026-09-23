import { Inject, Injectable } from '@nestjs/common';
import type { RecommendationResponse } from '@innlab/contracts';
import {
  RECOMMENDATION_REPOSITORY,
  type RecommendationRepositoryPort,
} from '../../domain/repositories/recommendation.repository.port.js';
import { RecommendationNotGeneratedError } from '../../domain/exceptions/routing.errors.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import { toRecomendacionResponse } from '../dtos/map-recommendation-response.js';

export interface GetRecommendationQuery {
  diagnosticId: string;
}

/**
 * Lee la recomendación persistida. No recalcula: devolver un resultado
 * distinto del que se guardó rompería la trazabilidad, que es justo lo
 * que este módulo promete.
 *
 * "Todavía no generada" es una salida normal y esperada, no una condición
 * excepcional.
 */
@Injectable()
export class GetRecommendationUseCase {
  constructor(
    @Inject(RECOMMENDATION_REPOSITORY)
    private readonly recommendations: RecommendationRepositoryPort,
  ) {}

  async execute(
    query: GetRecommendationQuery,
  ): Promise<Result<RecommendationResponse, RecommendationNotGeneratedError>> {
    const recommendation = await this.recommendations.findByDiagnosticId(
      query.diagnosticId,
    );
    if (!recommendation) {
      return Result.err(new RecommendationNotGeneratedError(query.diagnosticId));
    }

    return Result.ok(toRecomendacionResponse(recommendation));
  }
}
