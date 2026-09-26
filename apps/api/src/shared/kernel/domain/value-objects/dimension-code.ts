import {
  dimensionCodeSchema,
  type DimensionCode as DimensionCodeLiteral,
} from '@innlab/contracts';
import { InvariantViolationError } from '../errors/invariant-violation.error.js';

/**
 * The exhaustive set of IRL dimension codes per the KTH Innovation Readiness
 * Level framework. Authoritative source: schema.sql in the docs repository.
 */
export const DIMENSION_CODES: readonly DimensionCodeLiteral[] = [
  'TRL',
  'CRL',
  'BRL',
  'IPRL',
  'TmRL',
  'FRL',
] as const;

/**
 * Value object wrapping a dimension code. Use `DimensionCode.create` so that
 * invalid codes raise a domain error at the boundary instead of leaking into
 * use-case logic.
 */
export class DimensionCode {
  private constructor(public readonly value: DimensionCodeLiteral) {}

  static create(input: string): DimensionCode {
    const parsed = dimensionCodeSchema.safeParse(input);
    if (!parsed.success) {
      throw new InvariantViolationError(
        `DimensionCode must be one of ${DIMENSION_CODES.join(', ')}; received '${input}'`,
        { received: input },
      );
    }
    return new DimensionCode(parsed.data);
  }

  equals(other: DimensionCode): boolean {
    return this.value === other.value;
  }
}
