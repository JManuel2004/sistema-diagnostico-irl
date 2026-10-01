# routing

## Scope
Computes INNLAB's portfolio recommendation for a diagnostic: ordinal profiles → exclusions (eligibility) → score (affinity) → adjustments (exceptions) → explanation with a per-layer trace. Includes the catalog of INNLAB's official portfolio (twelve services; their intensities, stages and rules are simulated pending INNLAB). **Does not cover** the maturity profile (`diagnosis/`) or the roadmap (`roadmap/`).

## Rules that must hold
- **There is no configuration versioning**: there is a single configuration and the engine reads no historical versions — removed on purpose: no actor of the system publishes a second version. `scoring_parameters` is an explicit single row (`id = 1`), and the seed upserts every configuration table by its natural key (service name, calibration label, rule `code`), so re-seeding applies a recalibration ([ADR 0013](../../../../../docs/architecture/decisions/0013-routing-configuration-shape.md)).
- **The configuration is checked by the database and the seed:** a service's profile (`min_level`, `max_level`) is part of `portfolio_service`; its relevant stages are rows of `portfolio_service_stage` (an unknown stage fails the seed); its six ordinal intensities reference the calibration scale by id and are unique per dimension. Loading a configuration without its parameters answers `RoutingConfigurationMissingError` (`ROUTING_CONFIGURATION_MISSING`).
- **A service is scored or adjustment-only** (`portfolio_service.adjustment_only`, [ADR 0014](../../../../../docs/architecture/decisions/0014-adjustment-only-services.md)). An adjustment-only service takes no part in layers 1 and 2: the configuration repository keeps it apart, so it is never excluded or scored. It only enters the ranking through an `INCLUDE` adjustment, at the position the rule sets, without a score; from then on later adjustments can move or veto it like any other place. The database enforces the pairing: an exclusion only targets a scored service and `INCLUDE` only an adjustment-only one, with a position (composite foreign keys to `portfolio_service (id, adjustment_only)` plus checks); a scored service must have a level band. The seed checks the same before writing, and rejects an adjustment on an adjustment-only service that no earlier rule includes.
- **An included service is exempt from the threshold:** it has no score, so its position alone makes it the recommendation or an alternative, and it can avoid a «sin recomendación». A place of the ranking has either a score or the rule that included it (`ck_recommendation_rank_origin`).
- **What left the seed leaves the catalog:** the seed deletes the services no longer listed and rewrites the rule set, because the engine loads every service of the catalog. It refuses to delete a service a saved recommendation points to.
- The trace is kept as typed `jsonb` columns of the recommendation: it is the audit of each computation, not configuration versioning. An exclusion is recorded with the eligibility rule's `code`, never with its surrogate id.
- One recommendation per diagnostic (`UNIQUE (id_diagnostic)`); recomputing replaces it, it does not accumulate. The ranking is uniform (`recommendation_rank`): the recommended service is position 1 and the alternatives follow.
- It reads the taxonomy only through `shared/irl-taxonomy`'s port, never its ORM entities.
- `diagnosis/` never calls it: it reacts to `DeepAnalysisRequestedEvent`. A `Result.err` in the listener is logged and not propagated, so `roadmap/` can still react.
- **The justification is read by the initiative leader:** it names dimensions by the catalog's short name, never by their code or by the internal ordinal label (`primary`, `secondary`); when an adjustment decides, it quotes the reason declared by the center.

## Completeness
Implemented: three-layer engine with adjustment-only services, trace, idempotent persistence, AgroConecta acceptance case. The portfolio's services, descriptions and level bands are INNLAB's; the 72 intensities, the stages of each service, the calibration, the weights and every rule are simulated (`seeds/data/routing.ts`). No administration screen for the configuration (out of scope). The recommendation is generated only by `DeepAnalysisRequestedEvent`; there is no endpoint to generate it. The read endpoints verify the diagnostic belongs to the caller (`DiagnosticOwnershipPort`) and answer someone else's as missing (404).

## Responsibility (ubiquitous language)
"Which INNLAB service suits this initiative, and why": the recommendation, its alternatives and the explanation of how it was reached.

## Domain concepts
`Recommendation` (aggregate), `OrdinalProfile`, `CalibrationScale`, `ScoringParameters`, `ScoredCandidate`; services `EligibilityFilter`, `AffinityScorer`, `ExceptionEngine`, `OrdinalTranslator`, `PredicateCompiler`.

## What it exposes
- **Events it publishes:** `PortfolioRecommendationCalculatedEvent` (`shared/kernel/events/`); `diagnosis/` hears it to complete the deep analysis.
- **Events it listens to:** `DeepAnalysisRequestedEvent`.
- **HTTP (read only):** `GET diagnostics/:id/recommendation` and `GET diagnostics/:id/recommendation/trace`. Contracts in Swagger (`/api/docs`). Each recommended service carries its `description`, read live from `portfolio_service` (not snapshotted into the recommendation: it describes the service, not the result).

## What it depends on
`diagnosis/` through its exported `GetMaturityProfileUseCase` and `FindDiagnosisOwnerQuery` (behind `DiagnosticOwnershipPort`); `initiative/` through its exported `GetInitiativeCharacterizationUseCase` and `ListStagesUseCase` (behind `InitiativeCharacterizationPort`: the characterization, and the stage codes of the service profiles); `shared/irl-taxonomy` through `TAXONOMY_REPOSITORY`; `shared/kernel` for `EVENT_PUBLISHER`.

## Data it owns
Writes: `irl_diagnostic.portfolio_recommendation` (with the trace), and `recommendation_rank` (a place an adjustment included has no score and records the rule). Owns (seed only): `irl_catalog.portfolio_service`, `portfolio_service_stage`, `ordinal_intensity`, `eligibility_rule`, `exception_rule`, `scoring_parameters`, `calibration_label_value`.

## Test coverage
- **Unit:** the engine's domain (including `INCLUDE`, its position, the exemption from the threshold and later adjustments on an included service), AgroConecta acceptance (`acceptance/agroconecta.spec.ts`), justification builder, listener, and the checks of the routing seed (`routing-seed.spec.ts`).
- **Integration:** `recommendation-repository` (persistence, ranking positions, atomicity, the justification required); `recommendation-repository` also keeps an included place without a score, with its rule, and the database requires one of the two; `seed` (a recalibration is applied on re-seeding, services and rules that left the seed are removed, a referenced one is not, and the database refuses each rule on the wrong kind of service).
- **E2E:** `generate-recommendation` (including 404 for another user's diagnostic), `deep-analysis-events`.
