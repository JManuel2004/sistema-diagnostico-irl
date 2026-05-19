import { DimensionCode } from '../../../shared-kernel/domain/value-objects/dimension-code.js';
import { InvariantViolationError } from '../../../shared-kernel/domain/errors/invariant-violation.error.js';

/**
 * `DimensionPair` — one of the six dimension pairs evaluated for
 * imbalance (RF-10):
 *
 *   TRL ↔ CRL · TRL ↔ BRL · CRL ↔ BRL · TmRL ↔ FRL · BRL ↔ IPRL · TRL ↔ IPRL
 *
 * The KTH framework fixes these six pairs; the imbalance evaluator
 * (in the `maturity-profile` module, out of Stage 1 scope) consumes
 * them to classify the gap as critical / moderate / acceptable.
 */
export interface DimensionPairPersistence {
  readonly id: number;
  readonly leftCode: string;
  readonly rightCode: string;
}

export class DimensionPair {
  private constructor(
    public readonly id: number,
    public readonly left: DimensionCode,
    public readonly right: DimensionCode,
  ) {}

  static fromPersistence(row: DimensionPairPersistence): DimensionPair {
    if (row.leftCode === row.rightCode) {
      throw new InvariantViolationError(
        `DimensionPair sides must differ; received '${row.leftCode}' on both`,
      );
    }
    return new DimensionPair(
      row.id,
      DimensionCode.create(row.leftCode),
      DimensionCode.create(row.rightCode),
    );
  }

  /**
   * Order-insensitive equality — `(TRL, CRL)` and `(CRL, TRL)` describe
   * the same pair. The repository emits a canonical ordering on read so
   * callers do not need this in the common case.
   */
  equals(other: DimensionPair): boolean {
    return (
      (this.left.equals(other.left) && this.right.equals(other.right)) ||
      (this.left.equals(other.right) && this.right.equals(other.left))
    );
  }
}
