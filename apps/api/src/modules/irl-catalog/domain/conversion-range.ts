import { IrlLevel } from '../../../shared-kernel/domain/value-objects/irl-level.vo.js';
import { InvariantViolationError } from '../../../shared-kernel/domain/errors/invariant-violation.error.js';

/**
 * `ConversionRange` — one row of the SA-06 conversion table that maps
 * a Likert average to an IRL level.
 *
 * Authoritative table (PROJECT-SUMMARY §1.2):
 *
 * | Average     | IRL |
 * | ----------- | --- |
 * | 1.00–1.39   | 1   |
 * | 1.40–1.79   | 2   |
 * | 1.80–2.19   | 3   |
 * | 2.20–2.59   | 4   |
 * | 2.60–2.99   | 5   |
 * | 3.00–3.39   | 6   |
 * | 3.40–3.79   | 7   |
 * | 3.80–4.39   | 8   |
 * | 4.40–5.00   | 9   |
 *
 * Both bounds are inclusive on the lower end and inclusive on the upper
 * end (the table is continuous and exhaustive for averages in `[1, 5]`).
 *
 * The actual `irl-calculator` service (RF-07) lives in the
 * `maturity-profile` module and is **out of scope** for Stage 1.
 */
export interface ConversionRangePersistence {
  readonly avgMin: number;
  readonly avgMax: number;
  readonly irlLevel: number;
}

export class ConversionRange {
  private constructor(
    public readonly avgMin: number,
    public readonly avgMax: number,
    public readonly irlLevel: IrlLevel,
  ) {}

  static fromPersistence(row: ConversionRangePersistence): ConversionRange {
    if (row.avgMin < 1 || row.avgMax > 5 || row.avgMin > row.avgMax) {
      throw new InvariantViolationError(
        `ConversionRange bounds invalid: [${String(row.avgMin)}, ${String(row.avgMax)}]`,
      );
    }
    return new ConversionRange(
      row.avgMin,
      row.avgMax,
      IrlLevel.create(row.irlLevel),
    );
  }

  /** True when `avg` falls inside this range (both bounds inclusive). */
  contains(avg: number): boolean {
    return avg >= this.avgMin && avg <= this.avgMax;
  }
}
