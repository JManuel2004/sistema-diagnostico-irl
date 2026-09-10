import {
  CRITICAL_IRL_THRESHOLD,
  maturityProfileResponseSchema,
  type MaturityProfileResponse,
} from '@innlab/contracts';

function classifyAsymmetry(
  difference: number,
): MaturityProfileResponse['asymmetry']['classification'] {
  if (difference > 3) return 'critical';
  if (difference >= 2) return 'moderate';
  return 'acceptable';
}

/**
 * El API desplegado en Render todavía responde el contrato de mayo
 * (sin `strength`, `asymmetry` ni `gaps`). El schema actual los exige.
 * Completamos esas tres señales a partir de los niveles ya presentes
 * para no romper el parseo del perfil.
 */
export function parseMaturityProfileResponse(data: unknown): MaturityProfileResponse {
  const strict = maturityProfileResponseSchema.safeParse(data);
  if (strict.success) {
    return strict.data;
  }

  const legacy = maturityProfileResponseSchema
    .omit({ strength: true, asymmetry: true, gaps: true })
    .safeParse(data);
  if (!legacy.success) {
    throw strict.error;
  }

  const levels = legacy.data.dimensionResults.map((r) => r.irlLevel);
  const maxLevel = Math.max(...levels);
  const minLevel = Math.min(...levels);
  const difference = maxLevel - minLevel;

  return {
    ...legacy.data,
    strength: {
      dimensions: legacy.data.dimensionResults
        .filter((r) => r.irlLevel === maxLevel)
        .map((r) => r.dimensionCode),
      level: maxLevel,
    },
    asymmetry: {
      difference,
      classification: classifyAsymmetry(difference),
    },
    gaps: {
      dimensions: legacy.data.dimensionResults
        .filter((r) => r.irlLevel <= CRITICAL_IRL_THRESHOLD)
        .map((r) => r.dimensionCode),
      threshold: CRITICAL_IRL_THRESHOLD,
    },
  };
}
