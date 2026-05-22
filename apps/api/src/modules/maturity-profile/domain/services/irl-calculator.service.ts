import type { DimensionCode } from '../../../../shared-kernel/domain/value-objects/dimension-code.js';
import type { LikertValue } from '../../../../shared-kernel/domain/value-objects/likert-value.vo.js';
import type { IrlLevel } from '../../../../shared-kernel/domain/value-objects/irl-level.vo.js';
import type { ConversionRange } from '../../../irl-catalog/domain/conversion-range.js';
import { DimensionResult } from '../value-objects/dimension-result.vo.js';
import { MaturityProfileCalculationError } from '../errors/maturity-profile-calculation.error.js';

/**
 * Number of Likert answers per dimension. KTH IRL framework invariant —
 * not configurable. The questionnaire submission already enforces this on
 * the way in (`submitQuestionnaireSchema.length(48)` and the 6 dimension
 * grouping in `QuestionnaireStructureResponse`).
 */
export const ANSWERS_PER_DIMENSION = 8;

/**
 * Input to the calculator: 6 dimension codes, each mapped to its 8 Likert
 * answers in any order. The use case (application layer) is responsible
 * for fetching the persisted `respuesta` rows from the questionnaire
 * module and shaping them as this map BEFORE calling the calculator.
 */
export type AnswersByDimension = ReadonlyMap<
  DimensionCode,
  readonly LikertValue[]
>;

/**
 * `IrlCalculatorService` — pure domain service that turns 48 Likert
 * answers into 6 `DimensionResult`s.
 *
 * Algorithm (RF-07 / Annex A of the KTH guide):
 *   1. For each of the six IRL dimensions, sum the 8 Likert values
 *      (each in [1, 5]).
 *   2. Divide the sum by 8 → an `averageLikert` in [1.000, 5.000].
 *   3. Find the `ConversionRange` whose `[avgMin, avgMax]` interval
 *      contains the average → that range's `irlLevel` is the result.
 *   4. Emit a `DimensionResult { dimensionCode, averageLikert, irlLevel }`
 *      per dimension.
 *
 * Constraints enforced (RF-06 already happened at submission; we
 * defense-in-depth here):
 *   - The input map must contain exactly the six framework dimensions —
 *     no missing, no extras.
 *   - Each dimension must hold exactly 8 answers.
 *   - The conversion table must cover the calculated average — if a
 *     diagnostic-time table change leaves a gap, fail loud.
 *
 * Atomicity (DIAGIRL-34, error scenario "no guarda resultados parciales"):
 *   - This service is pure. It either returns all six results or throws
 *     `MaturityProfileCalculationError`. The caller (use case) wraps the
 *     persist step in a DB transaction — failure here means the database
 *     is never touched.
 *
 * Stateless and side-effect-free: no IO, no framework decorators, no
 * logger. Safe to call from unit tests with hand-built inputs.
 */
export class IrlCalculatorService {
  /**
   * Compute the six dimensional results.
   *
   * @param answersByDimension Map keyed by `DimensionCode`, values are
   *   arrays of exactly 8 `LikertValue` per dimension.
   * @param conversionTable The 9-row SA-06 conversion table (read from
   *   `irl_catalog.rango_conversion` by the use case).
   * @returns Array of 6 `DimensionResult`, NOT guaranteed to be in any
   *   particular order — the aggregate `MaturityProfile` sorts them
   *   canonically.
   * @throws MaturityProfileCalculationError when inputs are inconsistent
   *   or the conversion table fails to cover a calculated average.
   */
  calculate(
    answersByDimension: AnswersByDimension,
    conversionTable: readonly ConversionRange[],
  ): DimensionResult[] {
    this.assertInputShape(answersByDimension, conversionTable);

    const results: DimensionResult[] = [];
    for (const [dimensionCode, answers] of answersByDimension.entries()) {
      const average = this.average(dimensionCode, answers);
      const irlLevel = this.lookupIrlLevel(
        dimensionCode,
        average,
        conversionTable,
      );
      results.push(
        DimensionResult.create({
          dimensionCode,
          averageLikert: average,
          irlLevel,
        }),
      );
    }
    return results;
  }

  // ───────────────────────────────────────────────────────────────────────
  // Internals
  // ───────────────────────────────────────────────────────────────────────

  private assertInputShape(
    answersByDimension: AnswersByDimension,
    conversionTable: readonly ConversionRange[],
  ): void {
    if (conversionTable.length === 0) {
      throw new MaturityProfileCalculationError(
        'Conversion table is empty; cannot derive any IRL level',
      );
    }

    const presentCodes = [...answersByDimension.keys()].map((c) => c.value);
    if (presentCodes.length !== 6) {
      throw new MaturityProfileCalculationError(
        `Expected answers for 6 dimensions, received ${presentCodes.length}`,
        { presentDimensions: presentCodes },
      );
    }

    for (const [dim, ans] of answersByDimension.entries()) {
      if (ans.length !== ANSWERS_PER_DIMENSION) {
        throw new MaturityProfileCalculationError(
          `Dimension ${dim.value} has ${ans.length} answers, expected ${ANSWERS_PER_DIMENSION}`,
          {
            dimension: dim.value,
            actual: ans.length,
            expected: ANSWERS_PER_DIMENSION,
          },
        );
      }
    }
  }

  private average(
    dimensionCode: DimensionCode,
    answers: readonly LikertValue[],
  ): number {
    const sum = answers.reduce((acc, a) => acc + a.value, 0);
    const avg = sum / ANSWERS_PER_DIMENSION;
    if (!Number.isFinite(avg) || avg < 1 || avg > 5) {
      // Should be impossible if LikertValue invariants hold — defense
      // in depth in case someone slips an unvalidated number in.
      throw new MaturityProfileCalculationError(
        `Average for ${dimensionCode.value} fell outside [1, 5]: ${avg}`,
        { dimension: dimensionCode.value, average: avg },
      );
    }
    return avg;
  }

  private lookupIrlLevel(
    dimensionCode: DimensionCode,
    average: number,
    table: readonly ConversionRange[],
  ): IrlLevel {
    const match = table.find((r) => r.contains(average));
    if (!match) {
      throw new MaturityProfileCalculationError(
        `No conversion range covers average ${average} for dimension ${dimensionCode.value}`,
        { dimension: dimensionCode.value, average, tableSize: table.length },
      );
    }
    return match.irlLevel;
  }
}
