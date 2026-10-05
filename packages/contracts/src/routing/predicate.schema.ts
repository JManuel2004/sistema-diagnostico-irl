import { z } from 'zod';

/**
 * Predicate DSL of the routing engine.
 *
 * A predicate is a tree: leaves that compare a field of the diagnostic's
 * facts against a value, and `and` / `or` / `not` nodes that combine them.
 *
 * It is serialized as `jsonb`, not as free text: Postgres validates the
 * syntax on write and the predicate stays queryable from SQL.
 *
 * The compilation mode is what separates layers 1 and 3:
 *   - `BOOLEAN` (eligibility) allows only equality and membership. An
 *     eligibility rule expresses impossibility, not degree.
 *   - `WITH_DEGREE` (exceptions) also allows numeric comparisons.
 *
 * Rejecting the comparison operators in `BOOLEAN` mode is what
 * structurally keeps a degree condition out of the hard filter, instead of
 * leaving it to the discipline of whoever configures.
 */

/** Operators allowed in both modes. */
export const BOOLEAN_OPERATORS = ['=', '!=', 'contains', 'not_contains'] as const;

/** Operators that only the `WITH_DEGREE` mode allows. */
export const DEGREE_OPERATORS = ['>=', '<=', '>', '<', 'count>=', 'count<=', 'count='] as const;

export const operatorSchema = z.enum([...BOOLEAN_OPERATORS, ...DEGREE_OPERATORS]);
export type Operator = z.infer<typeof operatorSchema>;

/**
 * Whitelist of queryable fields. A field outside this list fails when
 * compiling, not when evaluating: configuring a rule against a field that
 * does not exist must break when someone writes it, not months later when
 * a diagnostic triggers it.
 */
export const QUERYABLE_FIELDS = [
  'bottleneck',
  'gaps',
  'criticalImbalances',
  'moderateImbalances',
  'averageLevel',
  'levelByDimension.TRL',
  'levelByDimension.CRL',
  'levelByDimension.BRL',
  'levelByDimension.IPRL',
  'levelByDimension.TmRL',
  'levelByDimension.FRL',
  'characterization.stage',
  'characterization.sector',
  'characterization.teamSize',
] as const;

export const fieldSchema = z.enum(QUERYABLE_FIELDS);
export type Field = z.infer<typeof fieldSchema>;

export const predicateLeafSchema = z
  .object({
    field: fieldSchema,
    op: operatorSchema,
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  })
  .describe('Comparison of a field of the facts against a value');

export type PredicateLeaf = z.infer<typeof predicateLeafSchema>;

export type Predicate = PredicateLeaf | { op: 'and' | 'or' | 'not'; operands: Predicate[] };

export const predicateSchema: z.ZodType<Predicate> = z.lazy(() =>
  z.union([
    predicateLeafSchema,
    z.object({
      op: z.enum(['and', 'or', 'not']),
      operands: z.array(predicateSchema).min(1),
    }),
  ]),
);

/** Compilation mode — decides which operators are accepted. */
export const compilationModeSchema = z.enum(['BOOLEAN', 'WITH_DEGREE']);
export type CompilationMode = z.infer<typeof compilationModeSchema>;
