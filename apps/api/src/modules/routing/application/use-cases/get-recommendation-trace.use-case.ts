import type { LayerTraceResponse } from '@innlab/contracts';
import { type RecommendationRepositoryPort } from '../../domain/repositories/recommendation.repository.port.js';
import { RecommendationNotGeneratedError } from '../../domain/exceptions/routing.errors.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import { toLayerTraceResponse } from '../dtos/map-recommendation-response.js';

export interface GetRecommendationTraceQuery {
  diagnosticId: string;
}

/**
 * Returns the trace by layers. A use case separate from the recommendation
 * read on purpose: they serve two audiences with different needs, and
 * keeping them apart lets authorization treat them differently.
 *
 * "Not generated yet" is a normal, expected outcome, not an exceptional
 * condition.
 */
export class GetRecommendationTraceUseCase {
  constructor(private readonly recommendations: RecommendationRepositoryPort) {}

  async execute(
    query: GetRecommendationTraceQuery,
  ): Promise<Result<LayerTraceResponse, RecommendationNotGeneratedError>> {
    const recommendation = await this.recommendations.findByDiagnosticId(
      query.diagnosticId,
    );
    if (!recommendation) {
      return Result.err(
        new RecommendationNotGeneratedError(query.diagnosticId),
      );
    }

    return Result.ok(toLayerTraceResponse(recommendation));
  }
}
