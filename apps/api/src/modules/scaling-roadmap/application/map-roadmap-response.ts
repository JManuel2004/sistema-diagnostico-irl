import type { RoadmapResponse } from '@innlab/contracts';
import type { ScalingRoadmap } from '../domain/entities/scaling-roadmap.aggregate.js';

/**
 * Mapea el agregado a la respuesta pública.
 *
 * Traducción directa: el agregado ya impone los invariantes que el
 * contrato declara (fases consecutivas, sin dimensiones repetidas, meta
 * por encima del nivel actual), así que aquí no hay lógica que repetir.
 */
export function toRoadmapResponse(roadmap: ScalingRoadmap): RoadmapResponse {
  return {
    diagnosticId: roadmap.diagnosticId.value,
    generatedAt: roadmap.generatedAt.toISOString(),
    phases: roadmap.phases.map((f) => ({
      order: f.order,
      dimensions: f.dimensions.map((d) => ({
        dimensionCode: d.dimensionCode,
        currentLevel: d.currentLevel,
        targetLevel: d.targetLevel,
        enables: [...d.enables],
      })),
    })),
    dimensionsWithoutIntervention: [...roadmap.dimensionsWithoutIntervention],
  };
}
