import { InvariantViolationError } from '../errors/invariant-violation.error.js';

/**
 * Innovation Readiness Level — integer in `[1, 9]`.
 *
 * The KTH IRL framework expresses dimension maturity on this scale.
 * The conversion from a 1–5 Likert average to an IRL level happens
 * inside the `maturity-profile` module via the fixed conversion table
 * (SA-06). The value object only enforces the range invariant.
 *
 * Lives in the shared kernel because both `maturity-profile` (write
 * side: stores computed levels) and any cross-cutting reporter that
 * consumes an IRL profile (read side) need the same type.
 */
export type IrlLevelValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const VALID_LEVELS: ReadonlySet<number> = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

export class IrlLevel {
  private constructor(public readonly value: IrlLevelValue) {}

  static create(input: number): IrlLevel {
    if (!Number.isInteger(input) || !VALID_LEVELS.has(input)) {
      throw new InvariantViolationError(
        `IrlLevel must be an integer in [1, 9]; received ${String(input)}`,
        { received: input },
      );
    }
    return new IrlLevel(input as IrlLevelValue);
  }

  equals(other: IrlLevel): boolean {
    return this.value === other.value;
  }

  /**
   * Difference between two levels in absolute value — used by the
   * imbalance evaluator (RF-10) to classify pairs.
   */
  diff(other: IrlLevel): number {
    return Math.abs(this.value - other.value);
  }
}
