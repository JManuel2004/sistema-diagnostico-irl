# irl-taxonomy

## Scope
The read-only catalog of the KTH IRL framework: the six dimensions, their imbalance pairs, the published framework versions and the average→level conversion table (SA-06) of each. It is a Shared Kernel: any module may import its domain. **Does not cover** the questionnaire statements (`diagnosis/`).

## Rules that must hold
- **Read only at runtime**: the data changes only through seeds, and a seed requires a migration.
- **The framework's content is versioned** ([ADR 0012](../../../../../docs/architecture/decisions/0012-framework-content-versioned.md)): the statements and the conversion ranges belong to a `framework_version`; the current one is the latest published. The seed never changes a version a diagnostic already uses, and checks that the conversion ranges cover every attainable average (k/8) exactly once; the database forbids overlapping ranges within a version (`EXCLUDE USING gist`).
- Dimension codes are exactly `TRL`, `CRL`, `BRL`, `IPRL`, `TmRL`, `FRL`; the IRL scale is 1..9.
- Other modules consume it **only through `TAXONOMY_REPOSITORY`**; reading its ORM entities directly is not an accepted exception.

## Completeness
Implemented and used by `diagnosis/` (questionnaire structure, profile, imbalances), `routing/` and `roadmap/`. No module reads its ORM entities any more.

## Responsibility (ubiquitous language)
"The framework": which dimensions are measured, how an average becomes a level and which pairs of dimensions are compared.

## Domain concepts
`Dimension` (including its expected minimum level and whether it can be in critical state), `DimensionPair`, `FrameworkVersion`, `ConversionRange`.

## What it exposes
The `TAXONOMY_REPOSITORY` port (dimensions, pairs, the current framework version or one by id or code, and a version's conversion ranges); domain entities `Dimension`, `DimensionPair`, `FrameworkVersion`, `ConversionRange`. No endpoints or events.

## What it depends on
Only `shared/kernel`.

## Data it owns
`irl_catalog.framework_version`, `dimension`, `dimension_pair`, `conversion_range` (written only by seed).

## Test coverage
- **Unit:** `Dimension`, `DimensionPair` and `ConversionRange` entities; `irl-levels-by-dimension`.
- **Integration:** `seed` (idempotency and content of the seed, refusal to rewrite a used version, the overlap exclusion).
- **Missing:** integration of the repository against a real database.
