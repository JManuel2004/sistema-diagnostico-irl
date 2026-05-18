import type { Dimension } from '../dimension.js';
import type { Statement } from '../statement.js';
import type { ConversionRange } from '../conversion-range.js';
import type { DimensionPair } from '../dimension-pair.js';

/**
 * Read-only port for the IRL catalog.
 *
 * The catalog is immutable at runtime — see PROJECT-SUMMARY §1.8 ("read
 * only at runtime, holds dimension, afirmacion, rango_conversion,
 * par_dimension..."). The port therefore exposes only queries; no
 * write methods exist by design.
 *
 * Adapters: `TypeOrmIrlCatalogRepository` (Postgres). A read-through
 * cache adapter is planned but deferred to a later phase.
 */
export const IRL_CATALOG_REPOSITORY = Symbol('IRL_CATALOG_REPOSITORY');

export interface IrlCatalogRepositoryPort {
  /** All six dimensions in display order (`orden` ascending). */
  findAllDimensions(): Promise<Dimension[]>;

  /** All 48 statements in `(dimensionOrden, sequence)` order. */
  findAllStatements(): Promise<Statement[]>;

  /** Statements that belong to a specific dimension, ordered by sequence. */
  findStatementsByDimensionCode(code: string): Promise<Statement[]>;

  /** The SA-06 conversion table — 9 rows. */
  findAllConversionRanges(): Promise<ConversionRange[]>;

  /** The six dimension pairs (RF-10). */
  findAllDimensionPairs(): Promise<DimensionPair[]>;
}
