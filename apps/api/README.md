# @innlab/api — Backend

The IRL Diagnostic System backend. **NestJS 11** running on **Fastify**, persisting to **PostgreSQL** via **TypeORM**, authenticating against the **INNLAB Amazon Cognito** User Pool, and consuming the **INNLAB Core API** for user context.

This README is for backend developers. For the system overview, see the [root README](../../README.md).

## Stack

| Concern        | Choice                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| HTTP framework | NestJS 11 with Fastify adapter                                                                                 |
| ORM            | TypeORM (mandated by the anteproyecto)                                                                         |
| Database       | PostgreSQL 16                                                                                                  |
| Authentication | Amazon Cognito (RS256 JWT, JWKS) — via `passport-jwt` + `jwks-rsa`                                            |
| Validation     | `class-validator` request DTOs at the HTTP boundary (422), `zod` contracts shared with the frontend            |
| API docs       | `@nestjs/swagger` document served by `@fastify/swagger` + `@fastify/swagger-ui` at `/api/docs`                 |
| Events         | `@nestjs/event-emitter`, behind the `EVENT_PUBLISHER` port                                                     |
| Logging        | Pino via `nestjs-pino`                                                                                         |
| Testing        | Jest; Testcontainers Postgres (integration); Supertest + nock (e2e); fast-check (property tests)                |

## First-time setup

From the **repo root**, not from this directory:

```bash
pnpm install
pnpm --filter @innlab/contracts build
cp apps/api/.env.example apps/api/.env.local
# edit apps/api/.env.local with real values

pnpm db:up

pnpm --filter @innlab/api db:migration:run
pnpm --filter @innlab/api db:seed
```

Requires **Node ≥ 24.9** (see the root `.nvmrc` and `engines`). Detailed walkthrough: [`docs/workflows/LOCAL-SETUP.md`](../../docs/workflows/LOCAL-SETUP.md).

## Run

```bash
pnpm --filter @innlab/api dev          # watch mode
pnpm --filter @innlab/api start        # one-shot
pnpm --filter @innlab/api start:prod   # production mode (after build)
```

The API listens on `APP_PORT` (default 3000). Endpoints are prefixed `/api/v1/`. Swagger UI is at `/api/docs` (JSON at `/api/docs/json`) outside production; with `NODE_ENV=production` it is not mounted.

## Folder structure

The module map is in [`docs/MODULES.md`](./docs/MODULES.md) and the layer layout inside a module in [`docs/conventions/CODE-STYLE.md`](../../docs/conventions/CODE-STYLE.md). This is the shape, not an inventory of classes — for what each module owns and exposes, read the `README.md` at its root.

```
apps/api/
├── src/
│   ├── main.ts                  # Fastify bootstrap, global prefix, configureApp()
│   ├── app.module.ts            # composition root: config, logging, ORM, event emitter
│   ├── api.module.ts            # mounts the bounded-context modules and the health probe
│   ├── config/                  # env validation, ormconfig factory
│   │
│   ├── shared/
│   │   ├── kernel/              # generic primitives, no bounded context
│   │   │   ├── domain/          # Uuid, LikertValue, IrlLevel, DomainError hierarchy, Result<T, E>
│   │   │   ├── application/     # unwrapResult(), EVENT_PUBLISHER port
│   │   │   ├── events/          # domain events that cross module boundaries
│   │   │   ├── infrastructure/
│   │   │   │   ├── database/    # data-source.ts, migrations/, seeds/
│   │   │   │   ├── events/      # EventEmitter-backed publisher (global EventsModule)
│   │   │   │   ├── nest/        # applicationProvider(): wires framework-free use cases
│   │   │   │   └── http/        # configureApp(), exception filters, problem-details
│   │   │   └── presentation/    # health probe, shared DTOs (DiagnosticIdParam), ApiErrors()
│   │   ├── irl-taxonomy/        # read-only IRL framework catalog (dimensions, pairs, conversion)
│   │   └── identity/            # Cognito guard + INNLAB Core client (anticorruption layer)
│   │
│   └── modules/                 # one NestJS module = one bounded context
│       ├── diagnosis/           # questionnaire + maturity profile + diagnostic state machine
│       ├── initiative/          # initiative profile + privacy consent
│       ├── routing/             # portfolio recommendation engine
│       └── roadmap/             # scaling roadmap
│
├── test/
│   ├── unit/                    # mirrors src/, no DB
│   ├── integration/             # repositories and seeds against a Testcontainers Postgres
│   └── e2e/                     # supertest against the real AppModule and the local database
│
├── .env.example
├── eslint.config.mjs
├── jest.config.js
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md                    # this file
```

Inside each module the layer split is **presentation → application → domain ← infrastructure**, and `presentation/` imports only from `application/` (enforced by `eslint-plugin-boundaries`):

```
modules/<name>/
├── domain/
│   ├── entities/  value-objects/  services/  exceptions/
│   ├── repositories/            # ports (Symbol token + interface)
│   └── events/                  # only events no other module listens to
├── application/
│   ├── use-cases/               # one class, one public method `execute()`; no framework imports
│   ├── ports/                   # what the module needs from another module
│   └── dtos/
├── infrastructure/
│   ├── database/{orm-entities,repositories}/
│   ├── messaging/               # @OnEvent listeners
│   └── *.adapter.ts             # adapters of application ports over another module's exported queries
├── presentation/controllers/     # controllers + dto/ (class-validator requests, Swagger responses)
├── <name>.module.ts               # use cases wired with applicationProvider(UseCase, [tokens])
└── README.md                    # scope, rules, exposed API, tests
```

Modules communicate through exported read queries and domain events, never by importing each other's entities. Cross-module events live in `shared/kernel/events/`. The decisions behind this layout are the ADRs in [`docs/architecture/decisions/`](../../docs/architecture/README.md).

## Architecture in one paragraph

Modular monolith with DDD-lite. One NestJS module per bounded context. Modules never call each other's processes directly: `diagnosis/` owns the diagnostic and publishes domain events (`DeepAnalysisRequestedEvent`), and `routing/` and `roadmap/` react independently (`roadmap/` asks `routing/`'s exported read query for each phase's service); `initiative/` publishes `InitiativeRegisteredEvent` and `diagnosis/` reacts. Synchronous calls between modules are limited to read-only queries that a module exports and the consumer reaches through a port of its own. Neither the domain nor the application layer imports framework code: use cases are plain classes that Nest builds through `applicationProvider`, and they publish events through the `EVENT_PUBLISHER` port. Repositories implement domain ports; HTTP clients (INNLAB Core) implement domain ports. The IRL calculator is a pure function over the conversion table, exhaustively property-tested.

## Database

Single PostgreSQL database, **two schemas**:

- `irl_catalog` — read-only at runtime. Holds the framework versions with their statements, conversion ranges and level descriptions ([ADR 0012](../../docs/architecture/decisions/0012-framework-content-versioned.md), [ADR 0017](../../docs/architecture/decisions/0017-level-descriptions.md)), dimensions, dimension pairs and dependencies, the roadmap parameters, sectors, initiative stages, the published consent texts (`consent_terms`), INNLAB's portfolio services — scored or adjustment-only ([ADR 0014](../../docs/architecture/decisions/0014-adjustment-only-services.md)), each with its card and tier ([ADR 0016](../../docs/architecture/decisions/0016-route-by-phases-with-services.md)) — with their stages and the routing configuration (ordinal intensities, eligibility and exception rules, the single row of scoring parameters, calibration labels). Populated by seeds only; the seed upserts by natural key and refuses to rewrite a framework version or a consent text that is already in use.
- `irl_diagnostic` — transactional. Holds `diagnostic`, `answer`, `dimension_result`, `imbalance_analysis`, `initiative`, `consent` (one row per acceptance), `initiative_profile` (one per diagnostic), `portfolio_recommendation` (with its trace), `recommendation_rank` (a place an adjustment included has no score), `scaling_roadmap` (owned by the four business modules; [ADR 0011](../../docs/architecture/decisions/0011-initiative-identity-and-consent-per-initiative.md)). Deleting a diagnostic or an initiative cascades to its rows ([ADR 0010](../../docs/architecture/decisions/0010-foreign-keys-cascade-across-modules.md)). There are no tables for the future reporting context: they are designed with it.

The read-only rule on `irl_catalog` is enforced by the code (no catalog writer outside the seeds); there are no per-schema database roles.

**Never** enable `synchronize: true`. Schema changes go through migrations.

**There is a single migration**, `20260518001-InitialSchema.ts`, and the project keeps it that way while no environment holds real data (the database is always rebuilt from scratch with `db:migration:run` + `db:seed`; once an environment with real data exists, schema changes become new incremental migrations instead). To change the schema, **edit that file** (`up()`, and `down()` if needed) and rebuild the database — do not add a new migration:

```bash
docker compose down -v && docker compose up -d postgres   # empty database
pnpm --filter @innlab/api db:migration:run
pnpm --filter @innlab/api db:seed
```

A unit test (`single-migration.spec.ts`) fails if a second migration file appears. The day an environment with real data exists this flips: every change becomes a new incremental migration and the initial one is never edited again.

## Authentication

The identity provider is the **Amazon Cognito User Pool shared across the INNLAB
ecosystem** — the same pool `innlab-core-api` validates against. It is not ours
to create or configure: ask the Core team for `COGNITO_JWKS_URI` and
`COGNITO_ISSUER` rather than standing up a pool of your own.

Four rules:

1. **Authentication is the default, not an opt-in.** `JwtAuthGuard` is registered
   as an `APP_GUARD` in `shared/identity/identity.module.ts`, so it covers the entire HTTP
   surface. A route opens up only by carrying `@Public()` — today just the
   health endpoints. Fail-closed: a new controller is protected the moment it is
   written, without anyone remembering to guard it.
2. **Validation is local and offline.** `jwks-rsa` caches the pool's public keys,
   so signature, issuer and algorithm (RS256) are verified with **no HTTP call
   per request**. There is deliberately **no audience / `client_id` check**: any
   valid token from the shared pool passes, in any product of the ecosystem.
   Per-product authorization is a separate question, answered by Core.
3. **Only an access token authenticates.** The SSO exchange hands the frontend
   both `token` (the id_token) and `accessToken`; the guard requires
   `token_use === 'access'` and rejects the id_token. Core enforces the same
   check, so accepting it here would turn a legible 401 into an opaque one one
   hop later.
4. **User context** (name, email, identifier) comes from the INNLAB Core API,
   **called once per session** and cached in memory. That call authenticates
   with the static `x-internal-key` header (`CORE_INTERNAL_KEY`), registered by
   hand by the Core team — not OAuth `client_credentials`, and never the user's
   own JWT. See RNF-05.

**Resource authorization** remains a separate concern, checked inside use cases through a port that answers `NotFoundError` / `ForbiddenError` (see `initiative/`'s `DiagnosticOwnershipPort`). RNF-04 — no user sees another user's diagnostics. Every per-diagnostic endpoint enforces it: `diagnosis`, `routing` and `roadmap` answer someone else's diagnostic as missing (404); the consent and initiative endpoints answer 403 for it.

When debugging an auth failure, read
[`test/e2e/shared/identity/cognito-jwt-guard.e2e-spec.ts`](./test/e2e/shared/identity/cognito-jwt-guard.e2e-spec.ts)
first: it pins the guard's real behaviour end to end — signature, issuer,
algorithm, `kid` lookup, `token_use`, and `@Public()` routes — by signing its own
RS256 tokens against a mocked JWKS.

## API design

REST, versioned at `/api/v1/`, resource-oriented around aggregate roots. English nouns in URLs (`/diagnostics`, `/initiative`, `/consent`, `/catalog`), like every identifier (see `docs/conventions/CODE-STYLE.md`), camelCase in JSON bodies, **RFC 7807 Problem Details** for errors with a project-specific `code` field. A malformed request body or path parameter answers **422** from its class-validator DTO; business outcomes map from `Result` errors (404, 403, 409, 422). Every endpoint is documented in Swagger with `@ApiOperation`, its typed response and its error statuses (`ApiErrors(...)`).

Full conventions: [`docs/conventions/API-CONVENTIONS.md`](../../docs/conventions/API-CONVENTIONS.md).

## Environment variables

Every variable is documented with a comment in [`.env.example`](./.env.example). Joi validates all variables at boot (`src/config/env.validation.ts`) — missing or malformed values fail fast.

## Scripts

All scripts run from the repo root via `pnpm --filter @innlab/api <script>`, or from this directory with `pnpm <script>`.

```bash
# development
dev                     # nest start --watch
build                   # contracts build + nest build
start                   # node dist/main.js
start:prod              # NODE_ENV=production node dist/main.js

# testing
test                    # all projects (unit + integration + e2e)
test:unit               # fast: domain + application, no DB
test:integration        # Testcontainers spins up Postgres (needs Docker)
test:e2e                # supertest against AppModule and the local database (pnpm db:up + migration + seed), self-signed JWT + mocked JWKS
test:cov                # coverage report
test:watch              # watch mode

# quality
lint                    # eslint
lint:fix                # eslint --fix
typecheck               # tsc --noEmit
format                  # prettier --write

# database
db:migration:run        # the single migration (see Database)
db:migration:revert
db:seed                 # idempotent: ON CONFLICT DO UPDATE
```

## Testing

Three tiers, three speed budgets:

| Tier        | Where               | What it tests                                                   | Budget          |
| ----------- | ------------------- | --------------------------------------------------------------- | --------------- |
| Unit        | `test/unit/`        | Domain + application, no IO                                     | < 5s full suite |
| Integration | `test/integration/` | Repositories and seeds against a Testcontainers Postgres        | < 60s           |
| E2E         | `test/e2e/`         | One spec per user story, full HTTP, self-signed JWT + mocked JWKS | < 3min          |

The browser end-to-end test of the whole flow lives in the frontend (`apps/web/tests/e2e/`, Playwright).

Coverage thresholds are scoped, not repo-wide (see `coverageThreshold` in `jest.config.js`): the `domain/` folders of `diagnosis`, `routing` and `roadmap` carry explicit minimums. Everything else is best-effort. The IRL calculator is property-tested with `fast-check` over the full Likert input space.

Conventions: [`docs/conventions/TESTING-CONVENTIONS.md`](../../docs/conventions/TESTING-CONVENTIONS.md).

## Linting and formatting

- **ESLint** with `typescript-eslint` for type-aware rules and `eslint-plugin-boundaries` to enforce layer boundaries (domain ↛ infrastructure, presentation → application only, no framework or IO package in `domain/` or `application/`). Boundary violations are lint errors.
- **Prettier** for formatting, configured at the repo root. Don't fight it.
- The Husky hooks are configured but inactive (`.npmrc` sets `ignore-scripts`, so `prepare` never installs them): run `pnpm lint` and `pnpm typecheck` before committing.
