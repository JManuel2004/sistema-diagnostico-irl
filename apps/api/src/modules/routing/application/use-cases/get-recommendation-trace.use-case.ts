import type { LayerTraceResponse } from '@innlab/contracts';
import { type RecommendationRepositoryPort } from '../../domain/repositories/recommendation.repository.port.js';
import { RecommendationNotGeneratedError } from '../../domain/exceptions/routing.errors.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import type { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { type DiagnosticOwnershipPort } from '../../domain/repositories/diagnostic-ownership.port.js';
import { toLayerTraceResponse } from '../dtos/map-recommendation-response.js';

export interface GetRecommendationTraceQuery {
  diagnosticId: string;
  /** The caller: someone else's diagnostic is answered as missing. */
  userId: string;
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
  constructor(
    private readonly recommendations: RecommendationRepositoryPort,
    private readonly ownership: DiagnosticOwnershipPort,
  ) {}

  async execute(
    query: GetRecommendationTraceQuery,
  ): Promise<Result<LayerTraceResponse, NotFoundError | RecommendationNotGeneratedError>> {
    const owned = await this.ownership.verify(query.diagnosticId, query.userId);
    if (!owned.ok) return owned;

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
