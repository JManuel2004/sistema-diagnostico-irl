import { Inject, Injectable } from '@nestjs/common';
import type { RecommendationResponse } from '@innlab/contracts';
import {
  RECOMMENDATION_REPOSITORY,
  type RecommendationRepositoryPort,
} from '../domain/ports/recommendation.repository.port.js';
import {
  ACTIVE_CONFIGURATION_REPOSITORY,
  type ActiveConfigurationRepositoryPort,
} from '../domain/ports/active-configuration.repository.port.js';
import { RecommendationNotGeneratedError } from '../domain/errors/portfolio-routing.errors.js';
import { toRecomendacionResponse } from './map-recommendation-response.js';

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
    @Inject(ACTIVE_CONFIGURATION_REPOSITORY)
    private readonly configuration: ActiveConfigurationRepositoryPort,
  ) {}

  async execute(query: GetRecommendationQuery): Promise<RecommendationResponse> {
    const recommendation = await this.recommendations.findByDiagnosticId(
      query.diagnosticId,
    );
    if (!recommendation) {
      throw new RecommendationNotGeneratedError(query.diagnosticId);
    }

    // El número de versión es de presentación; el vínculo real es el id
    // que la recomendación ya lleva congelado.
    const activa = await this.configuration.loadActive();
    return toRecomendacionResponse(recommendation, activa?.versionNumber ?? 0);
  }
}
