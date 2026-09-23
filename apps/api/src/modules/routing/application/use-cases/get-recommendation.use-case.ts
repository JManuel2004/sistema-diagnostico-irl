import { Inject, Injectable } from '@nestjs/common';
import type { RecommendationResponse } from '@innlab/contracts';
import {
  RECOMMENDATION_REPOSITORY,
  type RecommendationRepositoryPort,
} from '../../domain/repositories/recommendation.repository.port.js';
import { RecommendationNotGeneratedError } from '../../domain/exceptions/routing.errors.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import { toRecommendationResponse } from '../dtos/map-recommendation-response.js';

export interface GetRecommendationQuery {
  diagnosticId: string;
}

/**
 * Reads the persisted recommendation. It does not recalculate: returning a
 * result different from the saved one would break traceability, which is
 * exactly what this module promises.
 *
 * "Not generated yet" is a normal, expected outcome, not an exceptional
 * condition.
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

    return Result.ok(toRecommendationResponse(recommendation));
  }
}
