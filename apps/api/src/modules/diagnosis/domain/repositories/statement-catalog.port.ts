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
  /**
   * The 48 statements of a framework version, in
   * `(dimensionSequence, sequence)` order.
   */
  findStatements(frameworkVersionId: number): Promise<Statement[]>;
}
