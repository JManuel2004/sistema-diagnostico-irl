import type { RoadmapResponse } from '@innlab/contracts';
import type { ScalingRoadmap } from '../../domain/entities/scaling-roadmap.aggregate.js';

/**
 * Maps the aggregate to the public response.
 *
 * A direct translation: the aggregate already enforces the invariants
 * the contract declares (consecutive phases, no repeated dimensions,
 * target above the current level), so there is no logic to repeat here.
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
