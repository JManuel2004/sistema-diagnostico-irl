# API Modules

Deliberately short. Anything that can be derived from the code is **not** documented by hand: the endpoint list is Swagger (`/api/docs`), the folder layout is the repository, and what each module owns and exposes is in the `README.md` at the root of that module. This file is only the map that ties them together.

## Modules

| Module | Kind | README |
| --- | --- | --- |
| `modules/diagnosis` | Core — questionnaire, maturity profile, diagnostic state machine | [README](../src/modules/diagnosis/README.md) |
| `modules/initiative` | Supporting — initiatives, their consent history, the profile of each diagnostic | [README](../src/modules/initiative/README.md) |
| `modules/routing` | Core — portfolio recommendation engine | [README](../src/modules/routing/README.md) |
| `modules/roadmap` | Core — scaling roadmap | [README](../src/modules/roadmap/README.md) |
| `shared/irl-taxonomy` | Shared Kernel — read-only IRL framework catalog | [README](../src/shared/irl-taxonomy/README.md) |
| `shared/identity` | Anticorruption Layer — Cognito + INNLAB Core | [README](../src/shared/identity/README.md) |
| `shared/kernel` | Generic primitives, cross-module events, global technical layers | — |

## How modules talk to each other

- **Events** (`shared/kernel/events/`), in-process through `@nestjs/event-emitter`. Use cases publish through the `EVENT_PUBLISHER` port; listeners live in `infrastructure/messaging/` ([ADR 0002](../../../docs/architecture/decisions/0002-domain-events-between-modules.md)):
  - `initiative` → `InitiativeRegisteredEvent` → `diagnosis`
  - `diagnosis` → `DeepAnalysisRequestedEvent` → `routing`, `roadmap`
  - `routing` → `PortfolioRecommendationCalculatedEvent`, `roadmap` → `ScalingRoadmapCalculatedEvent` → `diagnosis`, which completes the deep analysis once both arrived ([ADR 0008](../../../docs/architecture/decisions/0008-deep-analysis-completes-from-its-results.md))
- **Exported read queries**: a module consumes another's exported query only for read-only data, behind a port declared in the consumer and implemented by an adapter in its `infrastructure/`:
  - `diagnosis` → `GetMaturityProfileUseCase` for `routing` and `roadmap`; `FindDiagnosisOwnerQuery` for `initiative`, `routing` and `roadmap` (each verifies the caller owns the diagnostic); `GetDiagnosisProgressQuery` (whether the deep analysis is accepted) and `ListUserDiagnosesQuery` for `initiative`.
  - `initiative` → `GetInitiativeCharacterizationUseCase` and `ListStagesUseCase` for `routing`.
  - `shared/irl-taxonomy` → `TAXONOMY_REPOSITORY` for everyone.
- Never entity objects across a module boundary; never a direct call into another module's process.

## Rules that do not change

Catalogs (`irl_catalog` schema) are read-only at runtime: application code reads, never writes; changes go through seeds gated by a migration. Layer rules (the application layer imports no framework: use cases are wired with `applicationProvider`, [ADR 0005](../../../docs/architecture/decisions/0005-framework-free-application-layer.md)) and language policy: [`docs/conventions/CODE-STYLE.md`](../../../docs/conventions/CODE-STYLE.md), enforced by `eslint.config.mjs`.

The overall architecture and its decisions: [`docs/architecture/`](../../../docs/architecture/README.md).
