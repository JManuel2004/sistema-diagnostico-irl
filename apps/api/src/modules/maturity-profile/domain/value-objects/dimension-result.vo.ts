import { DimensionCode } from '../../../../shared-kernel/domain/value-objects/dimension-code.js';
import { IrlLevel } from '../../../../shared-kernel/domain/value-objects/irl-level.vo.js';
import { InvariantViolationError } from '../../../../shared-kernel/domain/errors/invariant-violation.error.js';

/**
 * `DimensionResult` — value object that captures the outcome of the IRL
 * calculation for a single dimension (RF-07).
 *
 * Composition:
 *   - `dimensionCode` (TRL, CRL, BRL, IPRL, TmRL or FRL).
 *   - `averageLikert` ∈ [1.00, 5.00], the average of the 8 Likert answers
 *     for that dimension. Float; preserved with full precision so the UI
 *     can decide how many decimals to display.
 *   - `irlLevel` ∈ [1, 9], the level derived from `averageLikert` via the
 *     `irl_catalog.rango_conversion` table (Annex A of the KTH guide).
 *
 * Construction goes through the static factory `create(...)` so the
 * invariants are checked at the boundary; calling code cannot smuggle a
 * malformed result into the aggregate.
 *
 * Domain rule: there is no defined relationship between `averageLikert`
 * and `irlLevel` enforced inside this VO. The mapping happens in
 * `IrlCalculatorService` against the catalog table. Storing both fields
 * here keeps the result fully self-describing — useful for the report
 * view (RF-09 / HU-37 "resumen numérico").
 */
export interface DimensionResultPersistence {
  readonly dimensionCode: string;
  readonly averageLikert: number;
  readonly irlLevel: number;
}

export class DimensionResult {
  private constructor(
    public readonly dimensionCode: DimensionCode,
    public readonly averageLikert: number,
    public readonly irlLevel: IrlLevel,
  ) {}

  static create(input: {
    dimensionCode: DimensionCode;
    averageLikert: number;
    irlLevel: IrlLevel;
  }): DimensionResult {
    if (!Number.isFinite(input.averageLikert)) {
      throw new InvariantViolationError(
        `DimensionResult.averageLikert must be a finite number; received ${String(input.averageLikert)}`,
        { received: input.averageLikert },
      );
    }
    if (input.averageLikert < 1 || input.averageLikert > 5) {
      throw new InvariantViolationError(
        `DimensionResult.averageLikert must be in [1, 5]; received ${input.averageLikert}`,
        { received: input.averageLikert },
      );
    }
    return new DimensionResult(
      input.dimensionCode,
      input.averageLikert,
      input.irlLevel,
    );
  }

  /** Hydrate from a persisted `resultado_dimension` row. */
  static fromPersistence(row: DimensionResultPersistence): DimensionResult {
    return DimensionResult.create({
      dimensionCode: DimensionCode.create(row.dimensionCode),
      averageLikert: row.averageLikert,
      irlLevel: IrlLevel.create(row.irlLevel),
    });
  }

  /** Persistence snapshot for the repository to upsert. */
  toPersistence(): DimensionResultPersistence {
    return {
      dimensionCode: this.dimensionCode.value,
      averageLikert: this.averageLikert,
      irlLevel: this.irlLevel.value,
    };
  }

  equals(other: DimensionResult): boolean {
    return (
      this.dimensionCode.equals(other.dimensionCode) &&
      this.averageLikert === other.averageLikert &&
      this.irlLevel.equals(other.irlLevel)
    );
  }
}
