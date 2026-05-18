# `irl-catalog` module

Bounded context for the **read-only** IRL framework reference data: the six
dimensions, the 48 statements (afirmaciones), the SA-06 conversion ranges,
the six dimension pairs, the sector taxonomy, and (later) the roadmap
texts and portfolio routing tables.

Catalog rows are **immutable at runtime**: application code reads but never
writes. Updates ship as new seed runs gated by migrations (PROJECT-SUMMARY.md
§1.8, root `CLAUDE.md`).

## Stage 1 — what exists

- `irl-catalog.module.ts` — empty `@Module({})` registered into `ApiV1Module`.
- No domain entities, no use cases, no repositories, no controllers.
- Catalog tables (`dimension`, `afirmacion`) are created by the initial
  migration and populated by the seed in
  `src/infrastructure/database/seeds/`.

## Stage 2 — what arrives with HU-07

Story **HU-07 — "Consultar el cuestionario organizado por dimensiones IRL"**
(RF-05) is the only story in Stage 2 that touches this module:

| Layer             | File                                                           |
| ----------------- | -------------------------------------------------------------- |
| `domain/`         | `Dimension`, `Statement` value objects; `IrlCatalogPort`       |
| `application/`    | `GetQuestionnaireStructureUseCase`                             |
| `infrastructure/` | `DimensionOrm`, `AfirmacionOrm`, `TypeOrmIrlCatalogRepository` |
| `interfaces/`     | `IrlCatalogController` — `GET /api/v1/catalogo/cuestionario`   |

## Deferred (out of scope until later phases)

- `rango_conversion` and `par_dimension` tables and ORM entities — needed
  by E-04 (maturity profile, RF-07/RF-10), not by HU-07.
- `texto_roadmap`, `servicio_portafolio`, `regla_enrutamiento` — E-06 only.
- Catalog cache (`irl-catalog.cache.ts`). The 48-row response is small;
  caching is an optimisation, not a feature requirement.
