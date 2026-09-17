import type { MaturityProfileResponse } from '@innlab/contracts';
import type { MaturityProfile } from '../domain/entities/maturity-profile.aggregate.js';
import type { ImbalanceResult } from '../domain/value-objects/imbalance-result.vo.js';

const CLASSIFICATION_MAP = {
  CRITICO: 'critical',
  MODERADO: 'moderate',
  ACEPTABLE: 'acceptable',
} as const;

export function toMaturityProfileResponse(
  profile: MaturityProfile,
  imbalances: readonly ImbalanceResult[],
): MaturityProfileResponse {
  const bottleneck = profile.bottleneck();
  const strength = profile.strength();
  const asymmetry = profile.asymmetry();
  const gaps = profile.gaps();

  return {
    diagnosticId: profile.diagnosticId.value,
    computedAt: profile.computedAt.toISOString(),
    dimensionResults: profile.dimensionResults().map((r) => ({
      dimensionCode: r.dimensionCode.value,
      name: r.dimensionCode.value,
      averageLikert: r.averageLikert,
      irlLevel: r.irlLevel.value,
    })),
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
