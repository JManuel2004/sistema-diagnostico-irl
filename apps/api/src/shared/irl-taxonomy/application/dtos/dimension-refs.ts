import type { DimensionRef } from '@innlab/contracts';
import type { Dimension } from '../../domain/entities/dimension.js';
import { InvariantViolationError } from '../../../kernel/domain/errors/invariant-violation.error.js';

/**
 * The names the interface shows for each dimension, keyed by code.
 *
 * Every response that names a dimension takes its names from here, i.e. from
 * the catalog in the database, so the frontend keeps no name map of its own.
 */
export function dimensionRefsByCode(
  dimensions: readonly Dimension[],
): ReadonlyMap<string, DimensionRef> {
  return new Map(
    dimensions.map((d) => [
      d.code.value,
      { code: d.code.value, name: d.name, shortName: d.shortName },
    ]),
  );
}

/**
 * The reference of one dimension.
 *
 * @throws InvariantViolationError when the catalog has no such dimension —
 *   a seeded catalog always holds the six, so it means the seed did not run.
 */
export function requireDimensionRef(
  refs: ReadonlyMap<string, DimensionRef>,
  code: string,
): DimensionRef {
  const ref = refs.get(code);
  if (ref === undefined) {
    throw new InvariantViolationError(
      `The dimension catalog has no entry for '${code}'`,
      { code },
    );
  }
  return ref;
}
