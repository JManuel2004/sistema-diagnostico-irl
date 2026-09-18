import type { Statement } from '../entities/statement.js';

/**
 * Read-only port for the 48 questionnaire statements.
 *
 * Split off the old combined `IrlCatalogRepositoryPort` when `statement`
 * moved from `irl-catalog/` into `diagnosis/` — the six dimensions, the
 * conversion table and the dimension pairs stayed behind as
 * `shared/irl-taxonomy/`'s own `TaxonomyRepositoryPort`. This port only
 * covers what `diagnosis/` itself owns.
 */
export const STATEMENT_CATALOG_REPOSITORY = Symbol('STATEMENT_CATALOG_REPOSITORY');

export interface StatementCatalogPort {
  /** All 48 statements in `(dimensionSequence, sequence)` order. */
  findAllStatements(): Promise<Statement[]>;

  /** Statements that belong to a specific dimension, ordered by sequence. */
  findStatementsByDimensionCode(code: string): Promise<Statement[]>;
}
