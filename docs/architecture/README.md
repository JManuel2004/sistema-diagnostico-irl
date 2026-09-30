# Architecture

The system's shape and the decisions behind it. What can be read from the code (the folder tree, the endpoint list, the schema) is not repeated here: the tree is the repository, the endpoints are Swagger (`/api/docs`), the schema is the single migration. This folder holds only what the code cannot say — why it is built this way.

## Map

- **Backend modules and how they talk:** [`apps/api/docs/MODULES.md`](../../apps/api/docs/MODULES.md); each module's scope, rules and dependencies in the `README.md` at its root.
- **Frontend features and pages:** [`apps/web/docs/MODULES.md`](../../apps/web/docs/MODULES.md).
- **The diagnostic from start to results** (wizard, panel, states, events): [`diagnostic-flow.md`](./diagnostic-flow.md).
- **Layer rules and naming:** [`docs/conventions/CODE-STYLE.md`](../conventions/CODE-STYLE.md).

## Decisions

Architecture Decision Records: short (context, decision, consequences) and immutable once accepted. A later decision that changes one is a new ADR that says which one it supersedes.

| ADR | Decision |
| --- | --- |
| [0001](./decisions/0001-modular-monolith-bounded-contexts.md) | Modular monolith, one NestJS module per bounded context |
| [0002](./decisions/0002-domain-events-between-modules.md) | Modules react to each other through in-process domain events |
| [0003](./decisions/0003-result-for-business-outcomes.md) | Use cases return `Result<T, E>` for anticipable business outcomes |
| [0004](./decisions/0004-single-migration-until-real-data.md) | One migration script while no environment holds real data |
| [0005](./decisions/0005-framework-free-application-layer.md) | `application/` imports no framework: factories and an event port |
| [0006](./decisions/0006-validation-at-the-http-boundary.md) | Request DTOs validated with class-validator, answering 422 |
| [0007](./decisions/0007-initiative-draft-before-consent.md) | The wizard keeps the initiative in the browser until the consent |
| [0008](./decisions/0008-deep-analysis-completes-from-its-results.md) | The deep analysis completes when both of its results are saved |
| [0009](./decisions/0009-data-model-condensed.md) | Tables and columns without a reader or a writer are removed |
| [0010](./decisions/0010-foreign-keys-cascade-across-modules.md) | Foreign keys cascade on delete, also across modules |
| [0011](./decisions/0011-initiative-identity-and-consent-per-initiative.md) | An initiative has its own identity; its consent is a history |
| [0012](./decisions/0012-framework-content-versioned.md) | The IRL framework's content is versioned |
| [0013](./decisions/0013-routing-configuration-shape.md) | The routing configuration: natural keys, one row per fact, a uniform ranking |
| [0014](./decisions/0014-adjustment-only-services.md) | Adjustment-only services enter the ranking only through an adjustment |
