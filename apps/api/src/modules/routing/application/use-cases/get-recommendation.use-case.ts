import type { RecommendationResponse } from '@innlab/contracts';
import { type RecommendationRepositoryPort } from '../../domain/repositories/recommendation.repository.port.js';
import { RecommendationNotGeneratedError } from '../../domain/exceptions/routing.errors.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import type { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { type DiagnosticOwnershipPort } from '../../domain/repositories/diagnostic-ownership.port.js';
import { type RoutingConfigurationRepositoryPort } from '../../domain/repositories/routing-configuration.repository.port.js';
import { toRecommendationResponse } from '../dtos/map-recommendation-response.js';

export interface GetRecommendationQuery {
  diagnosticId: string;
  /** The caller: someone else's diagnostic is answered as missing. */
  userId: string;
}

/**
 * Reads the persisted recommendation. It does not recalculate: returning a
 * result different from the saved one would break traceability, which is
 * exactly what this module promises.
 *
 * "Not generated yet" is a normal, expected outcome, not an exceptional
 * condition.
 */
export class GetRecommendationUseCase {
  constructor(
    private readonly recommendations: RecommendationRepositoryPort,
    private readonly ownership: DiagnosticOwnershipPort,
    private readonly configuration: RoutingConfigurationRepositoryPort,
  ) {}

  async execute(
    query: GetRecommendationQuery,
  ): Promise<Result<RecommendationResponse, NotFoundError | RecommendationNotGeneratedError>> {
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

    const descriptions = await this.configuration.findServiceDescriptions();
    return Result.ok(toRecommendationResponse(recommendation, descriptions));
  }
}
