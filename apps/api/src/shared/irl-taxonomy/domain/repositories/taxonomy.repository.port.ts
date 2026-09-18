import type { Dimension } from '../entities/dimension.js';
import type { ConversionRange } from '../entities/conversion-range.js';
import type { DimensionPair } from '../entities/dimension-pair.js';

/**
 * Read-only port for the IRL taxonomy: the six dimensions, the SA-06
 * Likert->IRL conversion table, and the six fixed imbalance pairs.
 *
 * `Statement` is not part of this port. It used to be served alongside
 * the taxonomy by a single combined port when both lived in the old
 * `irl-catalog` module; now that `statement` belongs to `diagnosis/`
 * (its own content, not shared vocabulary), this port only exposes what
 * `shared/irl-taxonomy/` actually owns. See
 * `modules/diagnosis/domain/repositories/statement-catalog.port.ts` for
 * the other half.
 *
 * The catalog is immutable at runtime — queries only, no write methods
 * by design.
 */
export const TAXONOMY_REPOSITORY = Symbol('TAXONOMY_REPOSITORY');

export interface TaxonomyRepositoryPort {
  /** All six dimensions in display order (`sequence` ascending). */
  findAllDimensions(): Promise<Dimension[]>;

  /** The SA-06 conversion table — 9 rows. */
  findAllConversionRanges(): Promise<ConversionRange[]>;

  /** The six dimension pairs (RF-10). */
  findAllDimensionPairs(): Promise<DimensionPair[]>;
}
