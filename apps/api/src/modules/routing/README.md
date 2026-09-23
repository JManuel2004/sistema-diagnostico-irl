# routing

## Scope
Computes INNLAB's portfolio recommendation for a diagnostic: ordinal profiles → exclusions (eligibility) → score (affinity) → adjustments (exceptions) → explanation with a per-layer trace. Includes the catalog of the six services. **Does not cover** the maturity profile (`diagnosis/`) or the roadmap (`roadmap/`).

## Rules that must hold
- **There is no configuration versioning**: there is a single scoring configuration (`scoring_parameters` is a singleton through a unique index) and the engine reads no historical versions — removed on purpose: no actor of the system publishes a second version.
- `layer_trace` is kept: it is the audit of each computation, not configuration versioning.
- One recommendation per diagnostic (`UNIQUE (id_diagnostic)`); recomputing replaces it, it does not accumulate.
- It reads the taxonomy only through `shared/irl-taxonomy`'s port, never its ORM entities.
- `diagnosis/` never calls it: it reacts to `DeepAnalysisRequestedEvent`. A `Result.err` in the listener is logged and not propagated, so `roadmap/` can still react.
- **The justification is read by the initiative leader:** it names dimensions by the catalog's short name, never by their code or by the internal ordinal label (`primary`, `secondary`); when an adjustment decides, it quotes the reason declared by the center.

## Completeness
Implemented: three-layer engine, trace, idempotent persistence, AgroConecta acceptance case. No administration screen for the configuration (out of scope). The recommendation is generated only by `DeepAnalysisRequestedEvent`; there is no endpoint to generate it. Pending: the read endpoints do not verify that the diagnostic belongs to the caller.

## Responsibility (ubiquitous language)
"Which INNLAB service suits this initiative, and why": the recommendation, its alternatives and the explanation of how it was reached.

## Domain concepts
`Recommendation` (aggregate), `OrdinalProfile`, `CalibrationScale`, `ScoringParameters`, `ScoredCandidate`; services `EligibilityFilter`, `AffinityScorer`, `ExceptionEngine`, `OrdinalTranslator`, `PredicateCompiler`.

## What it exposes
- **Events it publishes:** `PortfolioRecommendationCalculatedEvent` (`shared/kernel/events/`); no module consumes it yet.
- **Events it listens to:** `DeepAnalysisRequestedEvent`.
- **HTTP (read only):** `GET diagnostics/:id/recommendation` and `GET diagnostics/:id/recommendation/trace`. Contracts in Swagger (`/api/docs`).

## What it depends on
`diagnosis/` through its exported `GetMaturityProfileUseCase`; `initiative/` through its exported `GetInitiativeCharacterizationUseCase` (behind `InitiativeCharacterizationPort`); `shared/irl-taxonomy` through `TAXONOMY_REPOSITORY`; `shared/kernel` for `EVENT_PUBLISHER`.

## Data it owns
Writes: `irl_diagnostic.portfolio_recommendation`, `recommendation_alternative`, `layer_trace`. Owns (seed only): `irl_catalog.portfolio_service`, `published_ordinal_profile`, `published_ordinal_intensity`, `published_eligibility_rule`, `published_exception_rule`, `scoring_parameters`, `calibration_label_value`.

## Test coverage
- **Unit:** the engine's domain, AgroConecta acceptance (`acceptance/agroconecta.spec.ts`), justification builder, listener.
- **Integration:** `recommendation-repository` (persistence and atomicity).
- **E2E:** `generate-recommendation`, `deep-analysis-events`.
