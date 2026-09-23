# diagnosis

## Scope
Runs the IRL questionnaire (48 statements, Likert scale 1..5) and computes the maturity profile (level 1..9 per dimension, bottleneck, gaps, imbalances). Owns the diagnostic's state machine. **Does not cover** the consent or the initiative profile (`initiative/`), nor the portfolio recommendation and the roadmap (`routing/`, `roadmap/`) — see `apps/api/docs/MODULES.md` and [the diagnostic flow](../../../../../docs/architecture/diagnostic-flow.md).

## Rules that must hold
- Six dimensions (`TRL`, `CRL`, `BRL`, `IPRL`, `TmRL`, `FRL`), eight statements per dimension, 48 in total; the SA-06 conversion table is fixed. A submission with a number of answers other than 48 is an `InvariantViolationError`.
- The six imbalance pairs are exactly TRL–CRL, TRL–BRL, CRL–BRL, TmRL–FRL, BRL–IPRL, TRL–IPRL; on a tie, the bottleneck includes **every** tied dimension.
- **Critical state (RF-13):** only CRL, BRL and TmRL can be in critical state (a gap in them); TRL, IPRL and FRL never get that alert whatever their level. `dimension.is_critical_dimension` says so and `MaturityProfile.criticalState()` applies it; `dimension_result.in_critical_state` is derived from there.
- State transitions are linear (`diagnosis-state.vo.ts`); none is skipped or undone.
- `diagnosis/` never calls `routing/` or `roadmap/`: it publishes `DeepAnalysisRequestedEvent` and each one reacts on its own. The event is published only **after** the transition is saved.
- **Every answer needs its justification** (`Answer`: non-blank after `trim`, up to 1000 characters; `answer.justification` is `NOT NULL` with a `CHECK` requiring a non-space character). A submission with a blank or missing justification is an `InvariantViolationError` (422) and stores nothing.
- The profile carries `globalAverage` (RF-09: simple mean of the six levels, one decimal, `MaturityProfile.globalAverage()`) and `criticalState` (RF-13) already computed: the client does not derive them. The diagnostic carries `completed` (it has its profile: `PROFILE_GENERATED` or later) and `deepAnalysisAccepted`, both derived from the state in the backend; the client does not infer them.
- **Starting a diagnostic is idempotent per user** (`StartDiagnosisUseCase`): if the user's last diagnostic is not `completed`, that one is returned instead of creating another; a new one is created only when there is none or the last one has its profile. The new diagnostic stays in `STARTED`: the consent and the initiative move it through events.
- Someone else's diagnostic is answered as missing (404), not as forbidden, so its id is not revealed.
- Use cases return `Result<T, E>` for anticipable business outcomes; only domain invariants and infrastructure failures throw.
- The application layer imports no framework: use cases are plain classes wired in `diagnosis.module.ts` with `applicationProvider`, and publish through `EVENT_PUBLISHER`.

## Completeness
- Implemented: questionnaire (E-03) with the justification of each answer, maturity profile (E-04) with the critical state, acceptance of the deep analysis (RF-11), reaction to the consent (RF-03) and to the initiative (RF-04), starting one's own diagnostic (HU-04, `StartDiagnosisUseCase`) and reading one's own diagnostic (`GetDiagnosisUseCase`).
- **Consent and initiative are mandatory steps**: `StartDiagnosisUseCase` leaves the diagnostic in `STARTED`; `ConsentRecordedEvent` takes it to `WITH_CONSENT`, `InitiativeRegisteredEvent` to `WITH_INITIATIVE`, and processing the questionnaire takes it through `QUESTIONNAIRE_IN_PROGRESS` up to `PROFILE_GENERATED`.
- **Known limit:** the "already has an unfinished one" check and the insert are not atomic; two simultaneous requests (two tabs) can each create a diagnostic.
- Pending: `DEEP_ANALYSIS_COMPLETE` and `DEEP_ANALYSIS_DECLINED` exist in the state machine but nothing moves a diagnostic into them.
- Pending: ownership is verified only by `GET diagnostics/:id` (and by `initiative/` before its writes); `finalize-initial`, `deep-analysis`, `profile` and `questionnaire` accept any authenticated user.

## Responsibility (ubiquitous language)
"Taking the diagnostic": answering the 48 statements, getting the initiative's maturity level in each dimension and knowing where the bottleneck is and which imbalances there are between dimensions.

## Domain concepts
`Diagnosis` (aggregate + `DiagnosisState`), `AnswerSheet` / `Answer`, `Statement`, `MaturityProfile` with `DimensionResult` and `ImbalanceResult`; domain services `IrlCalculatorService` and `ImbalanceEvaluatorService`.

## What it exposes
- **Exported read queries** (`diagnosis.module.ts`): `GetMaturityProfileUseCase` (consumed by `routing/` and `roadmap/`), `ListUserDiagnosesQuery` and `FindDiagnosisOwnerQuery` (consumed by `initiative/`, each behind a port of its own). Its repositories are not exported.
- **Events it publishes:** `DeepAnalysisRequestedEvent` (`shared/kernel/events/`).
- **Events it listens to:** `ConsentRecordedEvent` and `InitiativeRegisteredEvent` (published by `initiative/`).
- **HTTP:** `POST diagnostics` (starts one for the authenticated user), `GET diagnostics/:id` (one's own), `POST diagnostics/:id/finalize-initial`, `POST diagnostics/:id/deep-analysis`, `POST diagnostics/:id/questionnaire`, `GET diagnostics/:id/profile`, `GET catalog/questionnaire`. Contracts in Swagger (`/api/docs`); request bodies are validated by the class-validator DTOs in `presentation/controllers/dto/` (422 on failure). The profile names each dimension with the catalog's `name` and `shortName` (`GetMaturityProfileUseCase`); the frontend keeps no names of its own.

## What it depends on
- `shared/irl-taxonomy` only through `TAXONOMY_REPOSITORY` (dimensions, pairs, conversion table, critical dimensions). No ORM entity of another module is read.
- `shared/identity` for `@CurrentUser()`; `shared/kernel` for `Result`, errors, events and `EVENT_PUBLISHER`.

## Data it owns
Writes: `irl_diagnostic.diagnostic`, `answer`, `dimension_result`, `imbalance_analysis`. Owns (seed only): `irl_catalog.statement`.

## Test coverage
- **Unit:** domain (calculator, imbalance evaluator, aggregates, VOs), use cases and exported queries, controllers, consent listener.
- **Integration:** `answer-sheet-repository` (the justification is stored and the database requires it).
- **E2E:** `get-questionnaire-structure`, `deep-analysis-events` (the AgroConecta flow through events), `start-diagnosis`, and `initiative/registration-flow` (mandatory justification, critical state, `deepAnalysisAccepted`).
- **Missing:** integration of `typeorm-maturity-profile`, `typeorm-imbalance` and `typeorm-diagnosis` against a real database.
