import {
  CRITICAL_IRL_THRESHOLD,
  DIMENSION_CODES,
  IMBALANCE_PAIRS,
  type Characterization,
  type DiagnosticFacts,
  type DimensionCode,
} from '@innlab/contracts';

/**
 * The facts of a profile that has not been measured but projected: the
 * levels a route expects the initiative to reach by the start of a phase.
 *
 * Derived with the framework's own rules, so a projected profile is read by
 * the engine exactly as a measured one would be:
 *   - the bottleneck is every dimension at the lowest level (ties included);
 *   - the gaps are the dimensions at `CRITICAL_IRL_THRESHOLD` or below;
 *   - the six fixed pairs are classified by their difference: more than 3
 *     is critical, 2–3 moderate, less than 2 acceptable;
 *   - the average is the plain mean of the six levels.
 *
 * Pure function.
 */
export function factsFromLevels(
  diagnosticId: string,
  levels: Readonly<Record<DimensionCode, number>>,
  characterization: Characterization,
): DiagnosticFacts {
  const values = DIMENSION_CODES.map((code) => levels[code]);
  const lowest = Math.min(...values);
  return {
    diagnosticId,
    levelByDimension: { ...levels },
    bottlenecks: DIMENSION_CODES.filter((code) => levels[code] === lowest),
    gaps: DIMENSION_CODES.filter(
      (code) => levels[code] <= CRITICAL_IRL_THRESHOLD,
    ),
    imbalances: IMBALANCE_PAIRS.map(([left, right]) => {
      const difference = Math.abs(levels[left] - levels[right]);
      return {
        left,
        right,
        difference,
        classification:
          difference > 3
            ? ('CRITICAL' as const)
            : difference >= 2
              ? ('MODERATE' as const)
              : ('ACCEPTABLE' as const),
      };
    }),
    averageLevel: values.reduce((sum, level) => sum + level, 0) / values.length,
    characterization,
  };
}
