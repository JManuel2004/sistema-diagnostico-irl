import type { Dimension } from '../entities/dimension.js';
import type { ConversionRange } from '../entities/conversion-range.js';
import type { DimensionPair } from '../entities/dimension-pair.js';
import type { FrameworkVersion } from '../entities/framework-version.js';
import type { LevelDescriptions } from '../entities/level-descriptions.js';

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

  /** The latest published framework version, or `null` before any seed. */
  findCurrentFrameworkVersion(): Promise<FrameworkVersion | null>;

  /** A framework version by its id, or `null` if it does not exist. */
  findFrameworkVersionById(id: number): Promise<FrameworkVersion | null>;

  /** A framework version by its code, or `null` if it does not exist. */
  findFrameworkVersionByCode(code: string): Promise<FrameworkVersion | null>;

  /** The SA-06 conversion table of a framework version — 9 rows. */
  findConversionRanges(frameworkVersionId: number): Promise<ConversionRange[]>;

  /** The six dimension pairs (RF-10). */
  findAllDimensionPairs(): Promise<DimensionPair[]>;

  /** What each level means, per dimension and global, for a framework version. */
  findLevelDescriptions(frameworkVersionId: number): Promise<LevelDescriptions>;
}
