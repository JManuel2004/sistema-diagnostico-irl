/**
 * A sector entry from the read-only `irl_catalog.sector` taxonomy: a
 * section of the CIIU (its code and official title) or the «Otro» entry
 * (no code). Catalog data, not an aggregate — no invariants of its own
 * beyond what the database already enforces (unique name and code, a code
 * exactly when it is not «Otro»).
 */
export interface SectorCatalogEntry {
  readonly id: string;
  readonly code: string | null;
  readonly name: string;
  readonly classification: string;
  readonly isOther: boolean;
  /** What the section groups, in a line; for «Otro», when to choose it. */
  readonly description: string;
  /** Related words the registration form searches the sector by. */
  readonly keywords: readonly string[];
}

/**
 * An initiative-stage entry from the read-only
 * `irl_catalog.initiative_stage` taxonomy.
 */
export interface InitiativeStageCatalogEntry {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly sequence: number;
}

/**
 * Read-only port for the two small catalogs `initiative/` owns:
 * sectors and initiative stages. Both are immutable at runtime, same
 * convention as `shared/irl-taxonomy/`'s `TaxonomyRepositoryPort` —
 * kept as `initiative/`'s own port rather than folded into
 * `shared/irl-taxonomy/` because neither is IRL framework vocabulary,
 * they are INNLAB's own initiative-intake taxonomy.
 */
export const INITIATIVE_CATALOG_REPOSITORY = Symbol(
  'INITIATIVE_CATALOG_REPOSITORY',
);

export interface InitiativeCatalogPort {
  findAllSectors(): Promise<SectorCatalogEntry[]>;
  findSectorById(id: string): Promise<SectorCatalogEntry | null>;
  findAllStages(): Promise<InitiativeStageCatalogEntry[]>;
  findStageById(id: string): Promise<InitiativeStageCatalogEntry | null>;
  findStageByCode(code: string): Promise<InitiativeStageCatalogEntry | null>;
}
