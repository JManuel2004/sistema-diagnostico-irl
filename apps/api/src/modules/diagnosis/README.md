# diagnosis

## Scope
Runs the IRL questionnaire (48 statements, Likert scale 1..5) and computes the maturity profile (level 1..9 per dimension, bottleneck, gaps, imbalances). Owns the diagnostic's state machine. **Does not cover** the consent or the initiative profile (`initiative/`), nor the portfolio recommendation and the roadmap (`routing/`, `roadmap/`) — see `apps/api/docs/MODULES.md` and [the diagnostic flow](../../../../../docs/architecture/diagnostic-flow.md).

## Rules that must hold
- Six dimensions (`TRL`, `CRL`, `BRL`, `IPRL`, `TmRL`, `FRL`), eight statements per dimension, 48 in total; the SA-06 conversion table is fixed.
- **A diagnostic is answered with one framework version** ([ADR 0012](../../../../../docs/architecture/decisions/0012-framework-content-versioned.md)): `StartDiagnosisUseCase` stores the current one (`diagnostic.id_framework_version`; it fails if none is published), the questionnaire is served for a version (`GET catalog/questionnaire?version=`, 404 for an unknown one), answers to statements of another version are rejected (422), and the profile is computed with that version's conversion table. A submission with a number of answers other than 48 is an `InvariantViolationError`.
- The six imbalance pairs are exactly TRL–CRL, TRL–BRL, CRL–BRL, TmRL–FRL, BRL–IPRL, TRL–IPRL; on a tie, the bottleneck includes **every** tied dimension.
- **Critical state (RF-13):** only CRL, BRL and TmRL can be in critical state (a gap in them); TRL, IPRL and FRL never get that alert whatever their level. `dimension.is_critical_dimension` says so and `MaturityProfile.criticalState()` applies it; `dimension_result.in_critical_state` is derived from there.
- State transitions are linear (`diagnosis-state.vo.ts`); none is skipped or undone.
- **The answers freeze with the profile** (MD-04): they are accepted only up to `QUESTIONNAIRE_COMPLETE` (`Diagnosis.acceptsAnswers`); submitting or processing again from `PROFILE_GENERATED` on answers `ConflictError` (409).
- `diagnosis/` never calls `routing/` or `roadmap/`: it publishes `DeepAnalysisRequestedEvent` and each one reacts on its own. The event is published only **after** the transition is saved.
- **The justification of an answer is optional** (`Answer`: trimmed, up to 1000 characters; a blank or missing one is stored as `NULL`). `answer.justification` accepts `NULL`, and its `CHECK` still refuses whitespace-only text. A justification over 1000 characters is an `InvariantViolationError` (422) and stores nothing.
- The profile carries `globalAverage` (RF-09: simple mean of the six levels, one decimal, `MaturityProfile.globalAverage()`) and `criticalState` (RF-13) already computed: the client does not derive them.
- **Every score travels with its meaning** ([ADR 0017](../../../../../docs/architecture/decisions/0017-level-descriptions.md)): each dimension result carries `levelDescription`, the profile carries `globalLevel` (the average as shown, rounded half up: 3.5 → 4, `MaturityProfile.globalLevel()`, with its text) and `levelScale` (the nine texts of each dimension, for the roadmap's targets). The texts are those of the diagnostic's framework version, read through `TAXONOMY_REPOSITORY`. The diagnostic carries `completed` (it has its profile: `PROFILE_GENERATED` or later), `deepAnalysisAccepted` and `deepAnalysisCompleted` (both results saved: `DEEP_ANALYSIS_COMPLETE`, when the full report exists), all derived from the state in the backend; the client does not infer them.
- **Starting a diagnostic always starts from the beginning** (`StartDiagnosisUseCase`, DIAGIRL-26): it first deletes the user's diagnostics that are not `completed` (`DiagnosisRepositoryPort.deleteIncompleteByUserId`, with what hangs from them by cascade: the initiative profile snapshot), then creates a new one. An unfinished diagnostic is not resumed from a later session, because its answers only lived in the browser tab; completed diagnostics are never touched. The new diagnostic stays in `STARTED`: registering the initiative profile moves it through an event.
- **Only completed diagnostics are listed** (`ListUserDiagnosesQuery`): each with when its profile was computed and its global level, read as stored; nothing is recalculated.
- **Every endpoint verifies the caller owns the diagnostic** (`findOwnDiagnosis`, RNF-04): someone else's diagnostic is answered as missing (404), not as forbidden, so its id is not revealed. `GetMaturityProfileUseCase` has no user because `routing/` and `roadmap/` read it from an event; the endpoint goes through `GetOwnMaturityProfileUseCase`.
- **The deep analysis completes from its results:** `DeepAnalysisResultListener` records each "calculated" event on the diagnostic and, with both, moves it to `DEEP_ANALYSIS_COMPLETE`. The two events arrive at the same time, so the change goes through `DiagnosisRepositoryPort.modify`, which locks the row.
- Use cases return `Result<T, E>` for anticipable business outcomes; only domain invariants and infrastructure failures throw.
- The application layer imports no framework: use cases are plain classes wired in `diagnosis.module.ts` with `applicationProvider`, and publish through `EVENT_PUBLISHER`.

## Completeness
- Implemented: questionnaire (E-03) with the optional justification of each answer, maturity profile (E-04) with the critical state, acceptance of the deep analysis (RF-11), reaction to the initiative profile (RF-03, RF-04), starting one's own diagnostic (HU-04, `StartDiagnosisUseCase`), listing one's completed diagnostics (DIAGIRL-26, `ListUserDiagnosesQuery`) and reading one's own diagnostic (`GetDiagnosisUseCase`).
- **Consent and initiative are mandatory steps**: `StartDiagnosisUseCase` leaves the diagnostic in `STARTED`; `InitiativeRegisteredEvent` (a profile is only registered with a current consent) takes it through `WITH_CONSENT` to `WITH_INITIATIVE`, and processing the questionnaire takes it through `QUESTIONNAIRE_IN_PROGRESS` up to `PROFILE_GENERATED`.
- **Known limit:** deleting the unfinished diagnostics and creating the new one are two steps; two simultaneous starts (two tabs) can each create one, and the second deletes the first.
- Pending: `DEEP_ANALYSIS_DECLINED` exists in the state machine but nothing moves a diagnostic into it («Por ahora no» records nothing).

## Responsibility (ubiquitous language)
"Taking the diagnostic": answering the 48 statements, getting the initiative's maturity level in each dimension and knowing where the bottleneck is and which imbalances there are between dimensions.

## Domain concepts
`Diagnosis` (aggregate + `DiagnosisState`), `AnswerSheet` / `Answer`, `Statement`, `MaturityProfile` with `DimensionResult` and `ImbalanceResult`; domain services `IrlCalculatorService` and `ImbalanceEvaluatorService`.

## What it exposes
- **Exported read queries** (`diagnosis.module.ts`): `GetMaturityProfileUseCase` (consumed by `routing/`, `roadmap/` and `reporting/`), `GetDiagnosisUseCase` (consumed by `reporting/`: the caller's diagnostic and whether its deep analysis is complete), `GetDiagnosisAnswersQuery` (consumed by `reporting/`: the 48 statements of the diagnostic's version with the value and justification given, by dimension, someone else's diagnostic answered as missing), `FindDiagnosisOwnerQuery` (consumed by `initiative/`, `routing/` and `roadmap/` to verify ownership), `GetDiagnosisProgressQuery` (consumed by `initiative/`: whether the deep analysis is accepted) and `ListUserDiagnosesQuery` (consumed by `initiative/`: the completed diagnostics with their profile date and global level), each behind a port of the consumer. Its repositories are not exported.
- **Events it publishes:** `DeepAnalysisRequestedEvent` (`shared/kernel/events/`).
- **Events it listens to:** `InitiativeRegisteredEvent` (published by `initiative/`), `PortfolioRecommendationCalculatedEvent` (`routing/`) and `ScalingRoadmapCalculatedEvent` (`roadmap/`).
- **HTTP:** `POST diagnostics` (starts a new one for the authenticated user, deleting their unfinished ones), `GET diagnostics/:id` (one's own), `POST diagnostics/:id/finalize-initial`, `POST diagnostics/:id/deep-analysis`, `POST diagnostics/:id/questionnaire`, `GET diagnostics/:id/profile`, `GET catalog/questionnaire?version=` (the current version without the parameter). The diagnostic carries its `frameworkVersion` code. Contracts in Swagger (`/api/docs`); request bodies are validated by the class-validator DTOs in `presentation/controllers/dto/` (422 on failure). The profile names each dimension with the catalog's `name` and `shortName` (`GetMaturityProfileUseCase`); the frontend keeps no names of its own.

## What it depends on
- `shared/irl-taxonomy` only through `TAXONOMY_REPOSITORY` (dimensions, pairs, framework versions and their conversion tables, critical dimensions). No ORM entity of another module is read.
- `shared/identity` for `@CurrentUser()`; `shared/kernel` for `Result`, errors, events and `EVENT_PUBLISHER`.

## Data it owns
Writes: `irl_diagnostic.diagnostic` (with its framework version, and with `recommendation_calculated_at` and `roadmap_calculated_at`, when each result of the deep analysis arrived), `answer`, `dimension_result`, `imbalance_analysis`. Owns (seed only): `irl_catalog.statement`, one set per framework version.

## Test coverage
- **Unit:** domain (calculator, imbalance evaluator, aggregates including the completion of the deep analysis, VOs), use cases and exported queries (with the ownership check), controllers, initiative listener, the freeze of the answers.
- **Integration:** `answer-sheet-repository` (the justification is stored, a missing one as `NULL`, and the database refuses whitespace-only text).
- **E2E:** `get-questionnaire-structure`, `deep-analysis-events` (the AgroConecta flow through events, ending in `DEEP_ANALYSIS_COMPLETE`), `start-diagnosis`, and `initiative/registration-flow` (optional justification, critical state, `deepAnalysisAccepted`).
- **Missing:** integration of `typeorm-maturity-profile`, `typeorm-imbalance` and `typeorm-diagnosis` against a real database.
