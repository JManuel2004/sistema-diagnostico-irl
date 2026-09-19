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

export const IRL_MIN_LEVEL = 1;
export const IRL_MAX_LEVEL = 9;

/**
 * Whether `input` is a valid IRL level. The one place that states the
 * scale; anything else that needs to check a level (`DependencyGraph`,
 * for instance) asks here instead of restating `[1, 9]` (backlog 5.3).
 */
export function isValidIrlLevel(input: number): boolean {
  return (
    Number.isInteger(input) && input >= IRL_MIN_LEVEL && input <= IRL_MAX_LEVEL
  );
}

export class IrlLevel {
  private constructor(public readonly value: IrlLevelValue) {}

  static create(input: number): IrlLevel {
    if (!isValidIrlLevel(input)) {
      throw new InvariantViolationError(
        `IrlLevel must be an integer in [${String(IRL_MIN_LEVEL)}, ${String(IRL_MAX_LEVEL)}]; received ${String(input)}`,
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
