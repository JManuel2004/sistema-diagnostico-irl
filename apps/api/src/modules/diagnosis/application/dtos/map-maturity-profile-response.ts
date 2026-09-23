import type { MaturityProfileResponse } from '@innlab/contracts';
import type { MaturityProfile } from '../../domain/entities/maturity-profile.aggregate.js';
import type { ImbalanceResult } from '../../domain/value-objects/imbalance-result.vo.js';
import type { Dimension } from '../../../../shared/irl-taxonomy/domain/entities/dimension.js';
import {
  dimensionRefsByCode,
  requireDimensionRef,
} from '../../../../shared/irl-taxonomy/application/dtos/dimension-refs.js';

const CLASSIFICATION_MAP = {
  CRITICAL: 'critical',
  MODERATE: 'moderate',
  ACCEPTABLE: 'acceptable',
} as const;

export function toMaturityProfileResponse(
  profile: MaturityProfile,
  imbalances: readonly ImbalanceResult[],
  dimensions: readonly Dimension[],
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
      };
    }),
    globalAverage: profile.globalAverage(),
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
