import { Inject, Injectable } from '@nestjs/common';
import type { LayerTraceResponse } from '@innlab/contracts';
import {
  RECOMMENDATION_REPOSITORY,
  type RecommendationRepositoryPort,
} from '../domain/ports/recommendation.repository.port.js';
import {
  ACTIVE_CONFIGURATION_REPOSITORY,
  type ActiveConfigurationRepositoryPort,
} from '../domain/ports/active-configuration.repository.port.js';
import { RecommendationNotGeneratedError } from '../domain/errors/portfolio-routing.errors.js';
import { toTrazaCapasResponse } from './map-recommendation-response.js';

export interface GetRecommendationTraceQuery {
  diagnosticId: string;
}

/**
 * Devuelve la traza por capas. Caso de uso separado del anterior a
 * propósito: son dos audiencias con necesidades distintas, y tenerlos
 * separados permite que la autorización los trate distinto cuando exista
 * el módulo de identidad.
 */
@Injectable()
export class GetRecommendationTraceUseCase {
  constructor(
    @Inject(RECOMMENDATION_REPOSITORY)
    private readonly recommendations: RecommendationRepositoryPort,
    @Inject(ACTIVE_CONFIGURATION_REPOSITORY)
    private readonly configuration: ActiveConfigurationRepositoryPort,
  ) {}

  async execute(
    query: GetRecommendationTraceQuery,
  ): Promise<LayerTraceResponse> {
    const recommendation = await this.recommendations.findByDiagnosticId(
      query.diagnosticId,
    );
    if (!recommendation) {
      throw new RecommendationNotGeneratedError(query.diagnosticId);
    }

    const activa = await this.configuration.loadActive();
    return toTrazaCapasResponse(recommendation, {
      version: activa?.versionNumber ?? 0,
      calibration: activa?.calibrationSnapshotNumber ?? 0,
      parameters: activa?.parametersSnapshotNumber ?? 0,
    });
  }
}
