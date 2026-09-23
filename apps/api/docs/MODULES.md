# API Modules

Deliberately short. Anything that can be derived from the code is **not** documented by hand: the endpoint list is Swagger (`/api/docs`), the folder layout is the repository, and what each module owns and exposes is in the `README.md` at the root of that module. This file is only the map that ties them together.

## Modules

| Module | Kind | README |
| --- | --- | --- |
| `modules/diagnosis` | Core — questionnaire, maturity profile, diagnostic state machine | [README](../src/modules/diagnosis/README.md) |
| `modules/initiative` | Supporting — initiative profile, privacy consent | [README](../src/modules/initiative/README.md) |
| `modules/routing` | Core — portfolio recommendation engine | [README](../src/modules/routing/README.md) |
| `modules/roadmap` | Core — scaling roadmap | [README](../src/modules/roadmap/README.md) |
| `shared/irl-taxonomy` | Shared Kernel — read-only IRL framework catalog | [README](../src/shared/irl-taxonomy/README.md) |
| `shared/identity` | Anticorruption Layer — Cognito + INNLAB Core | [README](../src/shared/identity/README.md) |
| `shared/kernel` | Generic primitives, cross-module events, global technical layers | — |
| `reporting` (`audit`, `notifications`, `report`) | Not built — only ORM entities exist | — |

## How modules talk to each other

- **Events** (`shared/kernel/events/`), in-process through `@nestjs/event-emitter`:
  - `initiative` → `ConsentRecordedEvent` → `diagnosis`
  - `diagnosis` → `DeepAnalysisRequestedEvent` → `routing`, `roadmap`
  - `routing` → `PortfolioRecommendationCalculatedEvent`, `roadmap` → `ScalingRoadmapCalculatedEvent` → (`reporting`, when it exists)
- **Ports**: a module reads another's exported port only for read-only data (`diagnosis` → `GetMaturityProfileUseCase` for `routing`/`roadmap`; `initiative` → `GetInitiativeCharacterizationUseCase` for `routing`; `shared/irl-taxonomy` → `TAXONOMY_REPOSITORY` for everyone).
- Never entity objects across a module boundary; never a direct call into another module's process.

## Rules that do not change

Catalogs (`irl_catalog` schema) are read-only at runtime: application code reads, never writes; changes go through seeds gated by a migration. Layer rules and language policy: [`docs/conventions/CODE-STYLE.md`](../../../docs/conventions/CODE-STYLE.md), enforced by `eslint.config.mjs`.
