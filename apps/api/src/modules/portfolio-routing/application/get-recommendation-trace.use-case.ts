import { Inject, Injectable } from '@nestjs/common';
import type { TrazaCapasResponse } from '@innlab/contracts';
import {
  RECOMENDACION_REPOSITORY,
  type RecomendacionRepositoryPort,
} from '../domain/ports/recomendacion.repository.port.js';
import {
  ACTIVE_CONFIGURATION_REPOSITORY,
  type ActiveConfigurationRepositoryPort,
} from '../domain/ports/active-configuration.repository.port.js';
import { RecommendationNotGeneratedError } from '../domain/errors/portfolio-routing.errors.js';
import { toTrazaCapasResponse } from './map-recomendacion-response.js';

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
    @Inject(RECOMENDACION_REPOSITORY)
    private readonly recomendaciones: RecomendacionRepositoryPort,
    @Inject(ACTIVE_CONFIGURATION_REPOSITORY)
    private readonly configuracion: ActiveConfigurationRepositoryPort,
  ) {}

  async execute(
    query: GetRecommendationTraceQuery,
  ): Promise<TrazaCapasResponse> {
    const recomendacion = await this.recomendaciones.findByDiagnosticId(
      query.diagnosticId,
    );
    if (!recomendacion) {
      throw new RecommendationNotGeneratedError(query.diagnosticId);
    }

    const activa = await this.configuracion.loadActive();
    return toTrazaCapasResponse(recomendacion, {
      version: activa?.numeroVersion ?? 0,
      calibracion: activa?.numeroSnapshotCalibracion ?? 0,
      parametros: activa?.numeroSnapshotParametros ?? 0,
    });
  }
}
