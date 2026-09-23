# initiative

## Scope

The initiative profile (name, sector, product type, catalog stage and declared stage, team, target market, current funding) and the data-processing consent (Law 1581, RF-03), plus the user's list of diagnostics. **Does not cover** the diagnostic's state or the questionnaire (`diagnosis/`). The consent lives here, not in `diagnosis/`: Law 1581 ties the consent to the data being processed, and most of it is the initiative's.

## Rules that must hold

- Before writing a consent or an initiative, the `diagnosticId` must **exist and belong to the authenticated user** (`DiagnosticOwnershipPort`): `NotFoundError` if it does not exist, `ForbiddenError` if it belongs to someone else. This check comes before any other validation.
- The terms version is set by the backend (`CURRENT_TERMS_VERSION`); a client sending a different one gets `ConflictError` (409), it is never silently accepted. A malformed version is rejected earlier by the request DTO (422).
- There is no "reject consent": whoever does not accept does not send the request.
- **The initiative requires a recorded consent** (RF-03, RNF-06): `RegisterInitiativeUseCase` answers `ConflictError` (409) if the diagnostic has no consent, and stores nothing. Ownership is checked before the consent. The frontend wizard asks for the initiative first, keeps it as a browser draft and sends it after recording the consent ([ADR 0007](../../../../../docs/architecture/decisions/0007-initiative-draft-before-consent.md)).
- `initiative/` never changes the diagnostic's state: it publishes `ConsentRecordedEvent` **after** saving the consent and `InitiativeRegisteredEvent` **after** saving the initiative, and `diagnosis/` moves its own state machine.
- **Every profile field is mandatory** (the contract and the aggregate validate them; free text up to 500 characters, name from 3 to 120, a team of at least one person). The catalog stage (`stageId`) is what the router reads; `declaredStage` is the user's own description and is only shown back.
- Registering the initiative of the same diagnostic twice replaces the previous record (that is how it is edited from the panel) and does not move the diagnostic backwards.

## Completeness

- Implemented: recording and reading the consent (HU-05, wizard step 2), recording and reading the initiative (HU-06, with its form and its panel in the frontend), sector and stage catalogs for the form, "my diagnostics" list (HU-03), characterization for `routing/`.
- Registering the initiative moves the diagnostic to `WITH_INITIATIVE` through an event (`InitiativeRegisteredEvent`).
- Pending: `GetConsent` and `GetInitiative` do not verify ownership. `initiative.academic_linkage` has no writer. The sector catalog only holds the AgroConecta case's sector: INNLAB's taxonomy is missing.

## Responsibility (ubiquitous language)

"Who the initiative is and what it accepted": the basic data of the initiative being diagnosed and the record that its leader accepted the data processing.

## Domain concepts

`Initiative` (aggregate), `Consent` (entity), sector and stage catalogs (`InitiativeCatalogPort`).

## What it exposes

- **Exported use case:** `GetInitiativeCharacterizationUseCase` (consumed by `routing/` through its `InitiativeCharacterizationPort`).
- **Events it publishes:** `ConsentRecordedEvent` and `InitiativeRegisteredEvent` (`shared/kernel/events/`).
- **HTTP:** `POST/GET diagnostics/:id/consent`, `POST/GET diagnostics/:id/initiative`, `GET diagnostics` (one's own list, most recent first), `GET initiative-catalog/sectors` and `GET initiative-catalog/stages`. Contracts in Swagger (`/api/docs`); request bodies are validated by the class-validator DTOs in `presentation/controllers/dto/`.

## What it depends on

- `diagnosis/` only through its exported read queries, each behind a port declared here: `DiagnosticOwnershipPort` (`DiagnosisOwnershipAdapter` over `FindDiagnosisOwnerQuery`) and `UserDiagnosesPort` (`UserDiagnosesAdapter` over `ListUserDiagnosesQuery`).
- `shared/identity` for `@CurrentUser()`; `shared/kernel` for `EVENT_PUBLISHER`.

## Data it owns

Writes: `irl_diagnostic.consent`, `irl_diagnostic.initiative`. Owns (seed only): `irl_catalog.sector` and `initiative_stage`.

## Test coverage

- **Unit:** `Consent` and `Initiative` entities, `RecordConsentUseCase`, `RegisterInitiativeUseCase` (including the event), `ListMyDiagnosesUseCase`, `DiagnosisOwnershipAdapter`.
- **Integration:** `initiative-repository` (full profile, update, seeded catalogs).
- **E2E:** `consent-and-ownership` (consent → `WITH_CONSENT`, 403/404/409/422), `registration-flow` (start → initiative → questionnaire → profile).
- **Missing:** integration of the consent repository; tests of the controllers and of the read use cases.
