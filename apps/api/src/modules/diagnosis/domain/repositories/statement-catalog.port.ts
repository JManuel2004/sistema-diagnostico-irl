import type { Statement } from '../entities/statement.js';

/**
 * Read-only port for the 48 questionnaire statements.
 *
 * The statements belong to `diagnosis/`; the six dimensions, the
 * conversion table and the dimension pairs are `shared/irl-taxonomy/`'s
 * and are read through its `TaxonomyRepositoryPort`. This port only
 * covers what `diagnosis/` itself owns.
 */
export const STATEMENT_CATALOG_REPOSITORY = Symbol('STATEMENT_CATALOG_REPOSITORY');

export interface StatementCatalogPort {
  /** All 48 statements in `(dimensionSequence, sequence)` order. */
  findAllStatements(): Promise<Statement[]>;

  /** Statements that belong to a specific dimension, ordered by sequence. */
  findStatementsByDimensionCode(code: string): Promise<Statement[]>;
}
