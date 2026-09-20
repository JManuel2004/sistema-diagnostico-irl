import type { RoadmapResponse } from '@innlab/contracts';
import type { ScalingRoadmap } from '../../domain/entities/scaling-roadmap.aggregate.js';
import type { Dimension } from '../../../../shared/irl-taxonomy/domain/entities/dimension.js';
import {
  dimensionRefsByCode,
  requireDimensionRef,
} from '../../../../shared/irl-taxonomy/application/dtos/dimension-refs.js';

/**
 * Maps the aggregate to the public response.
 *
 * The aggregate already enforces the invariants the contract declares
 * (consecutive phases, no repeated dimensions, target above the current
 * level), so there is no logic to repeat here. What the mapper adds is the
 * dimension names, taken from the catalog: the aggregate speaks in codes.
 */
export function toRoadmapResponse(
  roadmap: ScalingRoadmap,
  dimensions: readonly Dimension[],
): RoadmapResponse {
  const refs = dimensionRefsByCode(dimensions);
  return {
    diagnosticId: roadmap.diagnosticId.value,
    generatedAt: roadmap.generatedAt.toISOString(),
    phases: roadmap.phases.map((f) => ({
      order: f.order,
      dimensions: f.dimensions.map((d) => {
        const ref = requireDimensionRef(refs, d.dimensionCode);
        return {
          dimensionCode: d.dimensionCode,
          name: ref.name,
          shortName: ref.shortName,
          currentLevel: d.currentLevel,
          targetLevel: d.targetLevel,
          enables: d.enables.map((code) => requireDimensionRef(refs, code)),
        };
      }),
    })),
    dimensionsWithoutIntervention: roadmap.dimensionsWithoutIntervention.map(
      (code) => requireDimensionRef(refs, code),
    ),
  };
}
