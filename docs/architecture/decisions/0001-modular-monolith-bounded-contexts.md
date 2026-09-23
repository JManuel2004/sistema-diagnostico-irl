# 0001 — Modular monolith, one NestJS module per bounded context

**Status:** accepted

## Context

The system is small (one team, one database, one deployment) but its domain splits cleanly: running the questionnaire and computing the maturity profile, the initiative and its consent, the portfolio recommendation, the scaling roadmap. Earlier versions split the questionnaire flow across several modules that called each other directly, and two modules read another module's ORM entities.

## Decision

- One deployable (NestJS on Fastify) with one module per bounded context: `diagnosis` (core), `initiative` (supporting), `routing` (core), `roadmap` (core), and three shared contexts: `shared/irl-taxonomy` (read-only framework catalog), `shared/identity` (anticorruption layer over Cognito and INNLAB Core) and `shared/kernel` (generic primitives and cross-module events).
- **Composition rule.** A context never triggers another context's process directly: that goes through domain events ([0002](./0002-domain-events-between-modules.md)). A synchronous call into another module is allowed only as a read-only query through something that module exports (a port, or a read use case/query), never its entities or ORM classes.
- `diagnosis` is the only orchestrator of the questionnaire → profile flow. The consent lives in `initiative` (Law 1581 ties it to the data being processed, most of which is the initiative's); the diagnostic's state machine stays in `diagnosis`.
- The catalog of INNLAB services lives inside `routing`, its only consumer. It becomes a module of its own the day a second module reads it directly.
- A future `reporting` module will generate the report and send the notification; it is not built.

## Consequences

- Four layers per module (`domain`, `application`, `infrastructure`, `presentation`), enforced by `eslint-plugin-boundaries`.
- Cross-module reads are explicit exports: `GetMaturityProfileUseCase`, `ListUserDiagnosesQuery` and `FindDiagnosisOwnerQuery` from `diagnosis`; `GetInitiativeCharacterizationUseCase` from `initiative`; `TAXONOMY_REPOSITORY` from `shared/irl-taxonomy`.
- No ORM entity is registered or related across modules.
