import type { ValueTransformer } from 'typeorm';

/**
 * Postgres returns `numeric` / `decimal` columns as strings, because the
 * type is arbitrary-precision and JavaScript's `number` is not. Without a
 * transformer a column typed `numeric(4,3)` arrives as `"3.375"` and every
 * arithmetic operation downstream silently becomes string concatenation.
 *
 * Every `numeric` column in this codebase holds a value that comfortably
 * fits an IEEE-754 double (Likert averages, IRL levels, scores, weights),
 * so coercing to `number` on read is safe here.
 */
export const numericTransformer: ValueTransformer = {
  to(value: number | null | undefined): number | null | undefined {
    return value;
  },
  from(value: string | null | undefined): number | null | undefined {
    return value === null || value === undefined ? value : Number(value);
  },
};
