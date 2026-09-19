# @innlab/api — Backend

The IRL Diagnostic System backend. **NestJS 10+** running on **Fastify**, persisting to **PostgreSQL** via **TypeORM**, authenticating against the **INNLAB Amazon Cognito** User Pool, and consuming the **INNLAB Core API** for user context.

This README is for backend developers. For the system overview, see the [root README](../../README.md).

## Stack

| Concern        | Choice                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| HTTP framework | NestJS 10 with Fastify adapter                                                                                 |
| ORM            | TypeORM (mandated by the anteproyecto)                                                                         |
| Database       | PostgreSQL 16                                                                                                  |
| Authentication | Amazon Cognito (RS256 JWT, JWKS) — via `passport-jwt` + `jwks-rsa`                                            |
| Validation     | `class-validator` at HTTP boundary, `zod` at cross-tier contract boundary                                      |
| Logging        | Pino via `nestjs-pino`                                                                                         |
| Mail           | `nodemailer` behind a `MailerPort`                                                                             |
| Caching        | In-memory via `@nestjs/cache-manager`                                                                          |
| Testing        | Jest (unit), Testcontainers (integration), Supertest (e2e), fast-check (property-based for the IRL calculator) |

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

The API listens on `APP_PORT` (default 3000). Endpoints are prefixed `/api/v1/`. Swagger UI is at `/api/v1/docs` in non-production environments.

## Folder structure

The structure and the reasoning behind it are defined in [`convenciones-objetivo.md`](../../convenciones-objetivo.md) (§1 module map, §2 module layout). This is the shape, not an inventory of classes — for what each module owns and exposes, read the `README.md` at its root.

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
│   │   │   ├── application/     # use-case interface, unwrapResult()
│   │   │   ├── events/          # domain events that cross module boundaries
│   │   │   ├── infrastructure/
│   │   │   │   ├── database/    # data-source.ts, migrations/, seeds/
│   │   │   │   └── http/        # configureApp(), exception filters, problem-details
│   │   │   └── presentation/controllers/   # health probe
│   │   ├── irl-taxonomy/        # read-only IRL framework catalog (dimensions, pairs, conversion)
│   │   └── identity/            # Cognito guard + INNLAB Core client (anticorruption layer)
│   │
│   └── modules/                 # one NestJS module = one bounded context
│       ├── diagnosis/           # questionnaire + maturity profile + diagnostic state machine
│       ├── initiative/          # initiative profile + privacy consent
│       ├── routing/             # portfolio recommendation engine
│       ├── roadmap/             # scaling roadmap
│       └── audit/ notifications/ report/   # ORM entity only — not built yet
│
├── test/
│   ├── unit/                    # mirrors src/, no DB
│   ├── integration/             # Testcontainers + Postgres
│   └── e2e/                     # supertest against the real AppModule
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
│   ├── use-cases/               # one class, one public method `execute()`
│   └── dtos/
├── infrastructure/
│   ├── database/{orm-entities,repositories}/
│   └── messaging/               # @OnEvent listeners
├── presentation/controllers/
├── <name>.module.ts
└── README.md                    # scope, rules, exposed API, tests (convenciones §4.4)
```

Modules communicate through ports and domain events, never by importing each other's entities. Cross-module events live in `shared/kernel/events/`.

## Architecture in one paragraph

Modular monolith with DDD-lite. One NestJS module per bounded context. Modules never call each other's processes directly: `diagnosis/` owns the diagnostic and publishes domain events (`DeepAnalysisRequestedEvent`), and `routing/` and `roadmap/` react independently; `initiative/` publishes `ConsentRecordedEvent` and `diagnosis/` reacts. Synchronous calls between modules are limited to read-only queries through a port. The domain layer imports zero framework code. Repositories implement domain ports; HTTP clients (INNLAB Core) implement domain ports. The IRL calculator is a pure function over the conversion table, exhaustively property-tested.

## Database

Single PostgreSQL database, **two schemas**:

- `irl_catalog` — read-only at runtime. Holds dimensions, statements, conversion ranges, dimension pairs, sectors, roadmap texts, portfolio services, routing rules. Populated by seeds; the app DB role has `SELECT` only.
- `irl_diagnostic` — transactional. Holds `diagnostic`, `initiative`, `consent`, `answer`, `dimension_result`, `imbalance_analysis`, `portfolio_recommendation`, `recommendation_alternative`, `layer_trace` (owned by the four business modules) plus the still-unbuilt `notificacion`, `descarga_reporte`, `evento_auditoria`.

The split is enforced at the database level via role grants — defense in depth beyond application code.

**Never** enable `synchronize: true`. Schema changes go through migrations.

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

**Resource authorization** remains a separate concern, checked inside use cases through a port that answers `NotFoundError` / `ForbiddenError` (see `initiative/`'s `DiagnosticOwnershipPort`). RNF-04 — no user sees another user's diagnostics. Today only consent and initiative registration enforce it; the other per-diagnostic endpoints do not yet (`backlog-deuda-tecnica.md` 14.2).

When debugging an auth failure, read
[`test/e2e/shared/identity/cognito-jwt-guard.e2e-spec.ts`](./test/e2e/shared/identity/cognito-jwt-guard.e2e-spec.ts)
first: it pins the guard's real behaviour end to end — signature, issuer,
algorithm, `kid` lookup, `token_use`, and `@Public()` routes — by signing its own
RS256 tokens against a mocked JWKS.

## API design

REST, versioned at `/api/v1/`, resource-oriented around aggregate roots. English nouns in URLs (`/diagnostics`, `/initiative`, `/consent`, `/catalog`), per `convenciones-objetivo.md` §3, camelCase in JSON bodies, **RFC 7807 Problem Details** for errors with a project-specific `code` field.

Full conventions: [`docs/conventions/api-design.md`](../../docs/conventions/api-design.md).
Error code catalog: [`docs/error-codes.md`](./docs/error-codes.md).

## Environment variables

Every variable is documented with a comment in [`.env.example`](./.env.example). Joi validates all variables at boot — missing or malformed values fail fast. Cross-reference: [`docs/environments/env-variables.md`](../../docs/environments/env-variables.md).

## Suggested scripts

All scripts run from the repo root via `pnpm --filter @innlab/api <script>`, or from this directory with `pnpm <script>`.

```bash
# development
dev                     # nest start --watch
build                   # nest build
start                   # node dist/main.js
start:prod              # NODE_ENV=production node dist/main.js

# testing
test                    # all projects (unit + integration + e2e)
test:unit               # fast: domain + application, no DB
test:integration        # Testcontainers spins up Postgres
test:e2e                # supertest against compiled app, self-signed JWT + mocked JWKS
test:cov                # coverage report
test:watch              # watch mode

# quality
lint                    # eslint
lint:fix                # eslint --fix
typecheck               # tsc --noEmit
format                  # prettier --write

# database
db:migration:generate -- src/shared/kernel/infrastructure/database/migrations/<Name>
db:migration:create   -- src/shared/kernel/infrastructure/database/migrations/<Name>
db:migration:run
db:migration:revert
db:seed                 # idempotent: ON CONFLICT DO UPDATE
```

## Testing

Three tiers, three speed budgets:

| Tier        | Where               | What it tests                                                   | Budget          |
| ----------- | ------------------- | --------------------------------------------------------------- | --------------- |
| Unit        | `test/unit/`        | Domain + application, no IO                                     | < 5s full suite |
| Integration | `test/integration/` | Repositories, use cases with DB (Testcontainers)                | < 60s           |
| E2E         | `test/e2e/`         | One spec per user story, full HTTP, self-signed JWT + mocked JWKS | < 3min          |

Coverage thresholds are scoped, not repo-wide (see `coverageThreshold` in `jest.config.js`): the `domain/` folders of `diagnosis`, `routing` and `roadmap` carry explicit minimums. Everything else is best-effort. The IRL calculator is property-tested with `fast-check` over the full Likert input space.

Conventions and recipes: [`docs/conventions/testing.md`](../../docs/conventions/testing.md) and [`docs/testing-recipes.md`](./docs/testing-recipes.md).

## Linting and formatting

- **ESLint** with `typescript-eslint` for type-aware rules and `eslint-plugin-boundaries` to enforce layer boundaries (domain ↛ infrastructure, etc.). Boundary violations are compile-time errors.
- **Prettier** for formatting, configured at the repo root. Don't fight it.
- Both run automatically via Husky pre-commit on staged files.
