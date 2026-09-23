# irl-taxonomy

## Scope
The read-only catalog of the KTH IRL framework: the six dimensions, their imbalance pairs and the average→level conversion table (SA-06). It is a Shared Kernel: any module may import its domain. **Does not cover** the questionnaire statements (`diagnosis/`).

## Rules that must hold
- **Read only at runtime**: the data changes only through seeds, and a seed requires a migration.
- Dimension codes are exactly `TRL`, `CRL`, `BRL`, `IPRL`, `TmRL`, `FRL`; the IRL scale is 1..9.
- Other modules consume it **only through `TAXONOMY_REPOSITORY`**; reading its ORM entities directly is not an accepted exception.

## Completeness
Implemented and used by `diagnosis/` (questionnaire structure, profile, imbalances), `routing/` and `roadmap/`. No module reads its ORM entities any more.

## Responsibility (ubiquitous language)
"The framework": which dimensions are measured, how an average becomes a level and which pairs of dimensions are compared.

## Domain concepts
`Dimension` (including its expected minimum level and whether it can be in critical state), `DimensionPair`, `ConversionRange`.

## What it exposes
The `TAXONOMY_REPOSITORY` port; domain entities `Dimension`, `DimensionPair`, `ConversionRange`. No endpoints or events.

## What it depends on
Only `shared/kernel`.

## Data it owns
`irl_catalog.dimension`, `dimension_pair`, `conversion_range` (written only by seed).

## Test coverage
- **Unit:** `Dimension`, `DimensionPair` and `ConversionRange` entities; `irl-levels-by-dimension`.
- **Integration:** `seed` (idempotency and content of the seed).
- **Missing:** integration of the repository against a real database.
