import { CRITICAL_IRL_THRESHOLD } from '@innlab/contracts';
import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { InvariantViolationError } from '../../../../shared/kernel/domain/errors/invariant-violation.error.js';
import { DIMENSION_CODES } from '../../../../shared/kernel/domain/value-objects/dimension-code.js';
import {
  DimensionResult,
  type DimensionResultPersistence,
} from '../value-objects/dimension-result.vo.js';

/**
 * `MaturityProfile` — aggregate root for the IRL maturity profile of a
 * single diagnostic (RF-07 and onward).
 *
 * Invariants enforced at construction:
 *   - Exactly **6** `DimensionResult` entries — one per IRL dimension.
 *   - Each of the six `DimensionCode` values (TRL, CRL, BRL, IPRL, TmRL,
 *     FRL) appears exactly once — no duplicates, no missing dimensions.
 *
 * Atomicity (acceptance criterion of DIAGIRL-34: "no guarda resultados
 * parciales"): the aggregate is built whole or not at all. The repository
 * persists it inside a single transaction; failure between the calculator
 * service and the repository raises a `MaturityProfileCalculationError`
 * and the database remains untouched.
 *
 * Modules communicate by id: other bounded contexts receive
 * `diagnosticId` and look up the profile via the repository, never
 * by holding a `MaturityProfile` instance directly.
 *
 * DIAGIRL-35 (bottleneck detection) and DIAGIRL-38 (imbalance evaluation)
 * compose the existing `dimensionResults` — they do **not** mutate this
 * aggregate. They will introduce their own aggregates (`Bottleneck`,
 * `ImbalanceAnalysis`) attached to the same diagnostic.
 */
export interface MaturityProfilePersistence {
  readonly diagnosticId: string;
  readonly computedAt: Date;
  readonly dimensionResults: readonly DimensionResultPersistence[];
}

export class MaturityProfile {
  private constructor(
    public readonly diagnosticId: Uuid,
    public readonly computedAt: Date,
    private readonly _dimensionResults: readonly DimensionResult[],
  ) {}

  /**
   * Build a fresh profile from a calculator output. The `dimensionResults`
   * array MUST contain exactly the six IRL dimensions, each exactly once.
   *
   * @throws InvariantViolationError if the array is not exactly six unique
   *   dimensions.
   */
  static create(input: {
    diagnosticId: Uuid;
    computedAt: Date;
    dimensionResults: readonly DimensionResult[];
  }): MaturityProfile {
    MaturityProfile.assertSixUniqueDimensions(input.dimensionResults);
    return new MaturityProfile(
      input.diagnosticId,
      input.computedAt,
      MaturityProfile.sortByCanonicalOrder(input.dimensionResults),
    );
  }

  /** Hydrate from the row set returned by the repository. */
  static fromPersistence(row: MaturityProfilePersistence): MaturityProfile {
    const results = row.dimensionResults.map((r) =>
      DimensionResult.fromPersistence(r),
    );
    MaturityProfile.assertSixUniqueDimensions(results);
    return new MaturityProfile(
      Uuid.create(row.diagnosticId),
      row.computedAt,
      MaturityProfile.sortByCanonicalOrder(results),
    );
  }

  /** Read-only view of the six dimensional results, in canonical order. */
  dimensionResults(): readonly DimensionResult[] {
    return this._dimensionResults;
  }

  /** Lookup the result for one specific dimension. */
  resultFor(dimensionCode: string): DimensionResult | undefined {
    return this._dimensionResults.find(
      (r) => r.dimensionCode.value === dimensionCode,
    );
  }

  /**
   * RF-08 — Identifies the bottleneck of the profile.
   *
   * The bottleneck is the dimension with the lowest IRL level. If several
   * dimensions share that minimum, all of them are reported (explicit tie —
   * the frontend must never assume size 1).
   */
  bottleneck(): {
    readonly dimensions: readonly DimensionResult[];
    readonly level: number;
  } {
    const minLevel = Math.min(
      ...this._dimensionResults.map((r) => r.irlLevel.value),
    );
    const dimensions = this._dimensionResults.filter(
      (r) => r.irlLevel.value === minLevel,
    );
    return { dimensions, level: minLevel };
  }

  /**
   * RF-09 — Global IRL average: the simple average of the six dimension
   * levels, rounded to one decimal. It does not replace the bottleneck
   * (RF-08): the initiative's progress is still the set of its six
   * dimensions; this is a complementary indicator.
   */
  globalAverage(): number {
    const levels = this._dimensionResults.map((r) => r.irlLevel.value);
    const mean = levels.reduce((sum, level) => sum + level, 0) / levels.length;
    return Math.round(mean * 10) / 10;
  }

  /**
   * The whole level the global average stands for, to pick what it means:
   * the average as shown (one decimal) rounded half up, so 3.5 → 4.
   */
  globalLevel(): number {
    return Math.min(9, Math.max(1, Math.round(this.globalAverage())));
  }

  /** Dimension(s) with the highest IRL level — the strength of the profile. */
  strength(): {
    readonly dimensions: readonly DimensionResult[];
    readonly level: number;
  } {
    const maxLevel = Math.max(
      ...this._dimensionResults.map((r) => r.irlLevel.value),
    );
    const dimensions = this._dimensionResults.filter(
      (r) => r.irlLevel.value === maxLevel,
    );
    return { dimensions, level: maxLevel };
  }

  /**
   * Spread of the profile: the difference between the highest and the lowest
   * IRL, classified with the same KTH imbalance thresholds.
   */
  asymmetry(): {
    readonly difference: number;
    readonly classification: 'CRITICAL' | 'MODERATE' | 'ACCEPTABLE';
  } {
    const levels = this._dimensionResults.map((r) => r.irlLevel.value);
    const difference = Math.max(...levels) - Math.min(...levels);
    const classification =
      difference > 3 ? 'CRITICAL' : difference >= 2 ? 'MODERATE' : 'ACCEPTABLE';
    return { difference, classification };
  }

  /**
   * Dimensions in gap: IRL level lower than or equal to the framework
   * threshold.
   *
   * The threshold is the contract's `CRITICAL_IRL_THRESHOLD`. It may return
   * no dimension — not an error, a profile without gaps.
   */
  gaps(): {
    readonly dimensions: readonly DimensionResult[];
    readonly threshold: number;
  } {
    const dimensions = this._dimensionResults.filter(
      (r) => r.irlLevel.value <= CRITICAL_IRL_THRESHOLD,
    );
    return { dimensions, threshold: CRITICAL_IRL_THRESHOLD };
  }

  /**
   * RF-13 — Dimensions in critical state.
   *
   * Only the dimensions the framework declares susceptible (CRL, BRL and
   * TmRL, `dimension.is_critical_dimension`) can be in critical state, and
   * they are when their IRL level is also in gap (`gaps()`). TRL, IPRL and
   * FRL never get this alert whatever their level, so a dimension in gap is
   * not by itself a critical dimension.
   *
   * @param criticalDimensions codes of the susceptible dimensions, taken
   *   from the catalog (`is_critical_dimension`).
   */
  criticalState(criticalDimensions: ReadonlySet<string>): {
    readonly dimensions: readonly DimensionResult[];
  } {
    const dimensions = this.gaps().dimensions.filter((r) =>
      criticalDimensions.has(r.dimensionCode.value),
    );
    return { dimensions };
  }

  /** Persistence snapshot — the repository upserts the whole set atomically. */
  toPersistence(): MaturityProfilePersistence {
    return {
      diagnosticId: this.diagnosticId.value,
      computedAt: this.computedAt,
      dimensionResults: this._dimensionResults.map((r) => r.toPersistence()),
    };
  }

  // ───────────────────────────────────────────────────────────────────────
  // Internals
  // ───────────────────────────────────────────────────────────────────────

  private static assertSixUniqueDimensions(
    results: readonly DimensionResult[],
  ): void {
    if (results.length !== DIMENSION_CODES.length) {
      throw new InvariantViolationError(
        `MaturityProfile must hold exactly ${DIMENSION_CODES.length} dimension results; received ${results.length}`,
        { received: results.length, expected: DIMENSION_CODES.length },
      );
    }
    const seen = new Set<string>();
    for (const r of results) {
      const code = r.dimensionCode.value;
      if (seen.has(code)) {
        throw new InvariantViolationError(
          `MaturityProfile has duplicate result for dimension '${code}'`,
          { duplicateDimension: code },
        );
      }
      seen.add(code);
    }
    for (const expected of DIMENSION_CODES) {
      if (!seen.has(expected)) {
        throw new InvariantViolationError(
          `MaturityProfile is missing result for dimension '${expected}'`,
          { missingDimension: expected, present: [...seen] },
        );
      }
    }
  }

  private static sortByCanonicalOrder(
    results: readonly DimensionResult[],
  ): readonly DimensionResult[] {
    const indexByCode = new Map<string, number>(
      DIMENSION_CODES.map((code, idx) => [code, idx]),
    );
    return [...results].sort(
      (a, b) =>
        (indexByCode.get(a.dimensionCode.value) ?? 0) -
        (indexByCode.get(b.dimensionCode.value) ?? 0),
    );
  }
}
