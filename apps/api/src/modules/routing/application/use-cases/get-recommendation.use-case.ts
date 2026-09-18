import { Inject, Injectable } from '@nestjs/common';
import type { RecommendationResponse } from '@innlab/contracts';
import {
  RECOMMENDATION_REPOSITORY,
  type RecommendationRepositoryPort,
} from '../../domain/repositories/recommendation.repository.port.js';
import { RecommendationNotGeneratedError } from '../../domain/exceptions/routing.errors.js';
import { toRecomendacionResponse } from '../dtos/map-recommendation-response.js';

export interface GetRecommendationQuery {
  diagnosticId: string;
}

/**
 * Lee la recomendación persistida. No recalcula: devolver un resultado
 * distinto del que se guardó rompería la trazabilidad, que es justo lo
 * que este módulo promete.
 */
@Injectable()
export class GetRecommendationUseCase {
  constructor(
    @Inject(RECOMMENDATION_REPOSITORY)
    private readonly recommendations: RecommendationRepositoryPort,
  ) {}

  async execute(query: GetRecommendationQuery): Promise<RecommendationResponse> {
    const recommendation = await this.recommendations.findByDiagnosticId(
      query.diagnosticId,
    );
    if (!recommendation) {
      throw new RecommendationNotGeneratedError(query.diagnosticId);
    }

    return toRecomendacionResponse(recommendation);
  }
}
