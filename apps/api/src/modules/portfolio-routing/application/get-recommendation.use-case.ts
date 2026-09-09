import { Inject, Injectable } from '@nestjs/common';
import type { RecomendacionResponse } from '@innlab/contracts';
import {
  RECOMENDACION_REPOSITORY,
  type RecomendacionRepositoryPort,
} from '../domain/ports/recomendacion.repository.port.js';
import {
  ACTIVE_CONFIGURATION_REPOSITORY,
  type ActiveConfigurationRepositoryPort,
} from '../domain/ports/active-configuration.repository.port.js';
import { RecommendationNotGeneratedError } from '../domain/errors/portfolio-routing.errors.js';
import { toRecomendacionResponse } from './map-recomendacion-response.js';

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
    @Inject(RECOMENDACION_REPOSITORY)
    private readonly recomendaciones: RecomendacionRepositoryPort,
    @Inject(ACTIVE_CONFIGURATION_REPOSITORY)
    private readonly configuracion: ActiveConfigurationRepositoryPort,
  ) {}

  async execute(query: GetRecommendationQuery): Promise<RecomendacionResponse> {
    const recomendacion = await this.recomendaciones.findByDiagnosticId(
      query.diagnosticId,
    );
    if (!recomendacion) {
      throw new RecommendationNotGeneratedError(query.diagnosticId);
    }

    // El número de versión es de presentación; el vínculo real es el id
    // que la recomendación ya lleva congelado.
    const activa = await this.configuracion.loadActive();
    return toRecomendacionResponse(recomendacion, activa?.numeroVersion ?? 0);
  }
}
