import type { MaturityProfileResponse } from '@innlab/contracts';
import type { MaturityProfile } from '../../domain/entities/maturity-profile.aggregate.js';
import type { ImbalanceResult } from '../../domain/value-objects/imbalance-result.vo.js';
import type { Dimension } from '../../../../shared/irl-taxonomy/domain/entities/dimension.js';
import type { LevelDescriptions } from '../../../../shared/irl-taxonomy/domain/entities/level-descriptions.js';
import { DIMENSION_CODES, type DimensionCode } from '@innlab/contracts';
import {
  dimensionRefsByCode,
  requireDimensionRef,
} from '../../../../shared/irl-taxonomy/application/dtos/dimension-refs.js';

const CLASSIFICATION_MAP = {
  CRITICAL: 'critical',
  MODERATE: 'moderate',
  ACCEPTABLE: 'acceptable',
} as const;

/**
 * Maps the profile to its response. Every score travels with what it means
 * (`levels`, from the framework version the diagnostic was answered with):
 * each dimension's current level, the global level, and the nine levels of
 * each dimension, which the roadmap's targets also use.
 */
export function toMaturityProfileResponse(
  profile: MaturityProfile,
  imbalances: readonly ImbalanceResult[],
  dimensions: readonly Dimension[],
  levels: LevelDescriptions,
): MaturityProfileResponse {
  const refs = dimensionRefsByCode(dimensions);
  const bottleneck = profile.bottleneck();
  const strength = profile.strength();
  const asymmetry = profile.asymmetry();
  const gaps = profile.gaps();
  // RF-13: which dimensions may be critical comes from the catalog.
  const critical = profile.criticalState(
    new Set(
      dimensions.filter((d) => d.isCriticalDimension).map((d) => d.code.value),
    ),
  );

  return {
    diagnosticId: profile.diagnosticId.value,
    computedAt: profile.computedAt.toISOString(),
    dimensionResults: profile.dimensionResults().map((r) => {
      const ref = requireDimensionRef(refs, r.dimensionCode.value);
      return {
        dimensionCode: r.dimensionCode.value,
        name: ref.name,
        shortName: ref.shortName,
        averageLikert: r.averageLikert,
        irlLevel: r.irlLevel.value,
        levelDescription: levels.forDimension(
          r.dimensionCode.value,
          r.irlLevel.value,
        ),
      };
    }),
    globalAverage: profile.globalAverage(),
    globalLevel: {
      level: profile.globalLevel(),
      description: levels.forGlobal(profile.globalLevel()),
    },
    levelScale: Object.fromEntries(
      DIMENSION_CODES.map((code: DimensionCode) => [
        code,
        levels.scaleOf(code),
      ]),
    ),
    bottleneck: {
      dimensions: bottleneck.dimensions.map((r) => r.dimensionCode.value),
      level: bottleneck.level,
    },
    strength: {
      dimensions: strength.dimensions.map((r) => r.dimensionCode.value),
      level: strength.level,
    },
    asymmetry: {
      difference: asymmetry.difference,
      classification: CLASSIFICATION_MAP[asymmetry.classification],
    },
    gaps: {
      dimensions: gaps.dimensions.map((r) => r.dimensionCode.value),
      threshold: gaps.threshold,
    },
    criticalState: {
      dimensions: critical.dimensions.map((r) => r.dimensionCode.value),
    },
    imbalances:
      imbalances.length === 6
        ? imbalances.map((i) => ({
            left: i.left.value,
            right: i.right.value,
            difference: i.difference,
            classification: CLASSIFICATION_MAP[i.classification],
          }))
        : undefined,
  };
}
