# routing

## Scope

Computes INNLAB's portfolio recommendation for a diagnostic: ordinal profiles → exclusions (eligibility) → score (affinity) → adjustments (exceptions) → explanation with a per-layer trace. Includes the catalog of INNLAB's official portfolio (twelve services with their card and tier; their intensities, stages and rules are simulated pending INNLAB), and evaluates, for `roadmap/`, the service of each phase of the route. **Does not cover** the maturity profile (`diagnosis/`) or the roadmap (`roadmap/`).

## Rules that must hold

- **There is no configuration versioning**: there is a single configuration and the engine reads no historical versions — removed on purpose: no actor of the system publishes a second version. `scoring_parameters` is an explicit single row (`id = 1`), and the seed upserts every configuration table by its natural key (service name, calibration label, rule `code`), so re-seeding applies a recalibration ([ADR 0013](../../../../../docs/architecture/decisions/0013-routing-configuration-shape.md)).
- **The configuration is checked by the database and the seed:** a service's profile (`min_level`, `max_level`) is part of `portfolio_service`; its relevant stages are rows of `portfolio_service_stage` (an unknown stage fails the seed); its six ordinal intensities reference the calibration scale by id and are unique per dimension. Loading a configuration without its parameters answers `RoutingConfigurationMissingError` (`ROUTING_CONFIGURATION_MISSING`).
- **A service is scored or adjustment-only** (`portfolio_service.adjustment_only`, [ADR 0014](../../../../../docs/architecture/decisions/0014-adjustment-only-services.md)). An adjustment-only service takes no part in layers 1 and 2: the configuration repository keeps it apart, so it is never excluded or scored. It only enters the ranking through an `INCLUDE` adjustment, at the position the rule sets, without a score; from then on later adjustments can move or veto it like any other place. The database enforces the pairing: an exclusion only targets a scored service and `INCLUDE` only an adjustment-only one, with a position (composite foreign keys to `portfolio_service (id, adjustment_only)` plus checks); a scored service must have a level band. The seed checks the same before writing, and rejects an adjustment on an adjustment-only service that no earlier rule includes.
- **Every service has a card and a tier** ([ADR 0016](../../../../../docs/architecture/decisions/0016-route-by-phases-with-services.md)): `subtitle`, `description` («¿De qué se trata?»), `scope` («Alcance y entregables») and its band, all verbatim from the portfolio, and a tier (`service_tier`: Descubre, Co-crea, Profundiza, Alíate; 1 is the lightest) with its promise and description from the portfolio's page (`tagline`, `description`), which the card carries so the interface can say what the tier is. The card is read live wherever a service is shown (`findServiceCatalog`, `toServiceDetail`): it describes the service, not the result. The tier does not change the recommendation; only the route by phases uses it.
- **The service of a phase** (`EvaluatePhaseServiceQuery`, read-only, exported): on the profile projected to the start of the phase (`factsFromLevels`), the first phase runs the recommendation's three layers and takes its first recommendable place; the next ones score by how each service works the phase's dimensions (`PhaseAffinityScorerService`: coverage weight × intensity × levels raised, plus stage, minus band). Services of a lighter tier than the previous phase's, and those already proposed, are left out; exclusions and adjustments apply as in the recommendation. The first place that reaches `phase_minimum_threshold` (an included one is exempt) is the service; if none does, the best one is returned as approximate. It writes nothing.
- **An included service is exempt from the threshold:** it has no score, so its position alone makes it the recommendation or an alternative, and it can avoid a «sin recomendación». A place of the ranking has either a score or the rule that included it (`ck_recommendation_rank_origin`).
- **What left the seed leaves the catalog:** the seed deletes the services no longer listed and rewrites the rule set, because the engine loads every service of the catalog. It refuses to delete a service a saved recommendation points to.
- The trace is kept as typed `jsonb` columns of the recommendation: it is the audit of each computation, not configuration versioning. An exclusion is recorded with the eligibility rule's `code`, never with its surrogate id.
- One recommendation per diagnostic (`UNIQUE (id_diagnostic)`); recomputing replaces it, it does not accumulate. The ranking is uniform (`recommendation_rank`): the recommended service is position 1 and the alternatives follow.
- It reads the taxonomy only through `shared/irl-taxonomy`'s port, never its ORM entities.
- `diagnosis/` never calls it: it reacts to `DeepAnalysisRequestedEvent`. A `Result.err` in the listener is logged and not propagated, so `roadmap/` can still react.
- **The justification is read by the initiative leader:** it names dimensions by the catalog's short name, never by their code or by the internal ordinal label (`primary`, `secondary`); when an adjustment decides, it quotes the reason declared by the center.

## Completeness

Implemented: three-layer engine with adjustment-only services, trace, idempotent persistence, AgroConecta acceptance case, the service card, and the evaluation of a phase's service for the roadmap. The portfolio's services, subtitles, descriptions, scopes, tiers and level bands are INNLAB's; the 72 intensities, the stages of each service, the calibration, the weights and every rule are simulated (`seeds/data/routing.ts`). No administration screen for the configuration (out of scope). The recommendation is generated only by `DeepAnalysisRequestedEvent`; there is no endpoint to generate it. The read endpoints verify the diagnostic belongs to the caller (`DiagnosticOwnershipPort`) and answer someone else's as missing (404).

## Responsibility (ubiquitous language)

"Which INNLAB service suits this initiative, and why": the recommendation, its alternatives and the explanation of how it was reached.

## Domain concepts

`Recommendation` (aggregate), `OrdinalProfile`, `CalibrationScale`, `ScoringParameters`, `PhaseScoringParameters`, `ScoredCandidate`, `ServiceCatalogEntry`; services `EligibilityFilter`, `AffinityScorer`, `PhaseAffinityScorer`, `ExceptionEngine`, `OrdinalTranslator`, `PredicateCompiler`, and `factsFromLevels` (the facts of a projected profile).

## What it exposes

- **Exported read queries** (`routing.module.ts`), consumed by `roadmap/` behind its `PhaseServiceAdvisorPort`: `EvaluatePhaseServiceQuery` (the service of a phase) and `GetServiceDetailsQuery` (the card of services by id).
- **Events it publishes:** `PortfolioRecommendationCalculatedEvent` (`shared/kernel/events/`); `diagnosis/` hears it to complete the deep analysis.
- **Events it listens to:** `DeepAnalysisRequestedEvent`.
- **HTTP (read only):** `GET diagnostics/:id/recommendation` and `GET diagnostics/:id/recommendation/trace`. Contracts in Swagger (`/api/docs`). Each recommended service carries its card — `subtitle`, `description`, `scope`, `band` and `tier` — read live from `portfolio_service` and `service_tier` (not snapshotted into the recommendation: it describes the service, not the result).

## What it depends on

`diagnosis/` through its exported `GetMaturityProfileUseCase` and `FindDiagnosisOwnerQuery` (behind `DiagnosticOwnershipPort`); `initiative/` through its exported `GetInitiativeCharacterizationUseCase` and `ListStagesUseCase` (behind `InitiativeCharacterizationPort`: the characterization, and the stage codes of the service profiles); `shared/irl-taxonomy` through `TAXONOMY_REPOSITORY`; `shared/kernel` for `EVENT_PUBLISHER`.

## Data it owns

Writes: `irl_diagnostic.portfolio_recommendation` (with the trace), and `recommendation_rank` (a place an adjustment included has no score and records the rule). Owns (seed only): `irl_catalog.service_tier`, `portfolio_service`, `portfolio_service_stage`, `ordinal_intensity`, `eligibility_rule`, `exception_rule`, `scoring_parameters` (including the phase weights `phase_coverage_weight` and `phase_minimum_threshold`), `calibration_label_value`.

## Test coverage

- **Unit:** the engine's domain (including `INCLUDE`, its position, the exemption from the threshold and later adjustments on an included service), AgroConecta acceptance (`acceptance/agroconecta.spec.ts`), justification builder, listener, the checks of the routing seed (`routing-seed.spec.ts`: tiers, subtitles, scopes), the projected facts, the phase scorer and `EvaluatePhaseServiceQuery` on the seeded configuration (`support/seed-configuration.ts`).
- **Integration:** `recommendation-repository` (persistence, ranking positions, atomicity, the justification required); `recommendation-repository` also keeps an included place without a score, with its rule, and the database requires one of the two; `seed` (a recalibration is applied on re-seeding, services and rules that left the seed are removed, a referenced one is not, and the database refuses each rule on the wrong kind of service).
- **E2E:** `generate-recommendation` (including 404 for another user's diagnostic, the service card and the route of services of AgroConecta), `deep-analysis-events`.
