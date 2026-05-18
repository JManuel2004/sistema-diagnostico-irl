import { likertValueSchema } from '@innlab/contracts';
import { InvariantViolationError } from '../errors/invariant-violation.error.js';

/**
 * Value object representing a single Likert-scale response (1..5).
 *
 * Constructed exclusively via the factory `LikertValue.create`. The factory
 * validates against the shared `likertValueSchema` from `@innlab/contracts`
 * so that the boundary contract and the domain invariant cannot drift.
 */
export type LikertValueNumber = 1 | 2 | 3 | 4 | 5;

export class LikertValue {
  private constructor(public readonly value: LikertValueNumber) {}

  static create(input: number): LikertValue {
    const parsed = likertValueSchema.safeParse(input);
    if (!parsed.success) {
      throw new InvariantViolationError(
        `LikertValue must be an integer in [1, 5]; received ${String(input)}`,
        { received: input },
      );
    }
    return new LikertValue(parsed.data as LikertValueNumber);
  }

  equals(other: LikertValue): boolean {
    return this.value === other.value;
  }
}
