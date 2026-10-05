# initiative

## Scope

The user's initiatives, the data-processing consent of each one (Law 1581, RF-03) and the initiative profile each diagnostic keeps (name, sector, product type, catalog stage and declared stage, team, target market, current funding), plus the user's list of diagnostics. **Does not cover** the diagnostic's state or the questionnaire (`diagnosis/`). The consent lives here, not in `diagnosis/`: Law 1581 ties the consent to the data being processed, which is the initiative's ([ADR 0011](../../../../../docs/architecture/decisions/0011-initiative-identity-and-consent-per-initiative.md)).

## Rules that must hold

- **An initiative has its own identity** and an owner (`cognito_user_id`). Reading or writing anything of an initiative requires it to exist (`NotFoundError`, 404) and to belong to the caller (`ForbiddenError`, 403). A diagnostic is checked the same way (`DiagnosticOwnershipPort`) before anything else.
- **The consent is a history per initiative.** Every acceptance is a new `consent` row; none is overwritten. The latest is the one that counts. A composite foreign key `(id_initiative, cognito_user_id)` guarantees in the database that whoever accepts owns the initiative.
- **Only the current text can be accepted.** The texts are the `irl_catalog.consent_terms` catalog (written by the seed; the current one is the latest published). Accepting another version answers `ConflictError` (409); a malformed version is rejected earlier by the request DTO (422). There is no "reject consent": whoever does not accept does not send the request.
- **An initiative is created together with its first acceptance** (`POST /initiatives`, one transaction): there is never an initiative without a consent.
- **A profile requires a current consent** (RF-03, RNF-06): `RegisterInitiativeProfileUseCase` checks, in order, the diagnostic's ownership, the initiative's ownership, that the initiative's latest acceptance is of the current text (409), and that the diagnostic has not accepted the deep analysis (409 — the recommendation and the roadmap were computed from the profile), before validating the sector and stage. It stores nothing if any fails.
- **The profile is a snapshot per diagnostic** (`initiative_profile`, unique per diagnostic): each diagnostic keeps the data it was computed with. Registering it again replaces that diagnostic's snapshot (that is how it is corrected) and does not move the diagnostic backwards.
- `initiative/` never changes the diagnostic's state: it publishes `InitiativeRegisteredEvent` **after** saving the profile, and `diagnosis/` moves its own state machine.
- **Every profile field is mandatory** (the contract and the aggregate validate them; free text up to 500 characters, name from 3 to 120, a team of at least one person). The catalog stage (`stageId`) is what the router reads; `declaredStage` is the user's own description and is only shown back.

## Completeness

- Implemented: the user's initiatives with their latest consent and profile (`ListMyInitiativesUseCase`), creating an initiative with its consent and accepting it again (HU-05, wizard step 2), the current consent text, recording and reading the profile of a diagnostic (HU-06, with its form and its panel in the frontend), sector and stage catalogs for the form, "my diagnostics" list (HU-03), characterization and stage codes for `routing/`.
- Pending: the sector catalog only holds the AgroConecta case's sector: INNLAB's taxonomy is missing. The consent text is provisional pending legal review.

## Responsibility (ubiquitous language)

"Who the initiative is and what it accepted": the initiatives a leader diagnoses, the record of each acceptance of the data processing, and the data of the initiative as it was at each diagnostic.

## Domain concepts

`Initiative` (aggregate: identity and owner), `InitiativeProfile` (aggregate: the snapshot of a diagnostic), `Consent` (entity: one acceptance), the consent texts (`ConsentTermsCatalogPort`), sector and stage catalogs (`InitiativeCatalogPort`).

## What it exposes

- **Exported use cases:** `GetInitiativeCharacterizationUseCase` and `ListStagesUseCase` (consumed by `routing/` through its `InitiativeCharacterizationPort`), and `GetInitiativeProfileUseCase` (consumed by `reporting/` for the full report).
- **Events it publishes:** `InitiativeRegisteredEvent` (`shared/kernel/events/`).
- **HTTP:** `GET initiatives` (one's own, with the latest consent and profile), `POST initiatives` (creates one with its first acceptance), `POST initiatives/:id/consent`, `GET consent-terms/current`, `POST/GET diagnostics/:id/initiative` (the profile, body with `initiativeId`), `GET diagnostics` (one's own list, most recent first), `GET initiative-catalog/sectors` and `GET initiative-catalog/stages`. Contracts in Swagger (`/api/docs`); request bodies are validated by the class-validator DTOs in `presentation/controllers/dto/`.

## What it depends on

- `diagnosis/` only through its exported read queries, each behind a port declared here: `DiagnosticOwnershipPort` (`DiagnosisOwnershipAdapter` over `FindDiagnosisOwnerQuery` and `GetDiagnosisProgressQuery`) and `UserDiagnosesPort` (`UserDiagnosesAdapter` over `ListUserDiagnosesQuery`).
- `shared/identity` for `@CurrentUser()`; `shared/kernel` for `EVENT_PUBLISHER`.

## Data it owns

Writes: `irl_diagnostic.initiative`, `consent` (insert only: a row is an acceptance) and `initiative_profile` (every column mandatory; one per diagnostic). Owns (seed only): `irl_catalog.consent_terms`, `sector` and `initiative_stage`.

## Test coverage

- **Unit:** `Initiative`, `InitiativeProfile` and `Consent`; `CreateInitiativeUseCase`, `RecordConsentUseCase`, `RegisterInitiativeProfileUseCase` (the order of the checks, the event), `ListMyInitiativesUseCase`, `ListMyDiagnosesUseCase`, `DiagnosisOwnershipAdapter`.
- **Integration:** `initiative-repository` (consent history, the owner and terms foreign keys, the profile snapshot and its replacement, seeded catalogs).
- **E2E:** `consent-and-ownership` (terms, initiatives, consent history, 403/404/409/422, the profile moving the diagnostic to `WITH_INITIATIVE`, frozen after the deep analysis), `registration-flow` (start → initiative → questionnaire → profile).
- **Missing:** tests of the controllers and unit tests of the read use cases (their ownership check is covered by `consent-and-ownership`); a 409 through the publication of a new text end to end (it would change the shared database's current text; covered by unit tests).
