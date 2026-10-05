import type { RoadmapResponse, ServiceDetail } from '@innlab/contracts';
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
 * dimension names, taken from the catalog: the aggregate speaks in codes,
 * and the card of each phase's service, from the portfolio catalog. The
 * name is the one the phase was calculated with.
 */
export function toRoadmapResponse(
  roadmap: ScalingRoadmap,
  dimensions: readonly Dimension[],
  services: ReadonlyMap<number, ServiceDetail>,
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
          finalTargetLevel: d.finalTargetLevel,
          enables: d.enables.map((code) => requireDimensionRef(refs, code)),
          inclusionReason: d.inclusionReason,
          expectedMinimum: d.expectedMinimum,
          targetReason: d.targetReason,
          targetDrivenBy:
            d.targetDrivenBy === null
              ? null
              : requireDimensionRef(refs, d.targetDrivenBy),
        };
      }),
      service: phaseService(f.service, services),
      serviceTrace: f.serviceTrace,
    })),
    finalLevels: { ...roadmap.finalLevels },
    balanced: roadmap.balanced,
    dimensionsWithoutIntervention: roadmap.dimensionsWithoutIntervention.map(
      (code) => requireDimensionRef(refs, code),
    ),
  };
}

/**
 * The phase's service with its card. A service no longer in the catalog
 * cannot be described: the phase then shows none rather than a card made
 * up from the snapshot.
 */
function phaseService(
  snapshot: ScalingRoadmap['phases'][number]['service'],
  services: ReadonlyMap<number, ServiceDetail>,
): RoadmapResponse['phases'][number]['service'] {
  if (!snapshot) return null;
  const detail = services.get(snapshot.idService);
  if (!detail) return null;
  return { ...detail, name: snapshot.name, approximate: snapshot.approximate };
}
