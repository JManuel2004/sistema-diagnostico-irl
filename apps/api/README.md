# @innlab/api — Backend

The IRL Diagnostic System backend. **NestJS 10+** running on **Fastify**, persisting to **PostgreSQL** via **TypeORM**, authenticating against **Keycloak** via OIDC, and consuming the **InnLab Core API** for user context.

This README is for backend developers. For the system overview, see the [root README](../../README.md).

## Stack

| Concern        | Choice                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| HTTP framework | NestJS 10 with Fastify adapter                                                                                 |
| ORM            | TypeORM (mandated by the anteproyecto)                                                                         |
| Database       | PostgreSQL 16                                                                                                  |
| Authentication | Keycloak (OIDC, RS256 JWT, JWKS) — via `passport-jwt` + `jwks-rsa`                                             |
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
pnpm keycloak:up

pnpm --filter @innlab/api db:migration:run
pnpm --filter @innlab/api db:seed
```

Detailed walkthrough: [`docs/workflows/local-setup.md`](../../docs/workflows/local-setup.md).

## Run

```bash
pnpm --filter @innlab/api dev          # watch mode
pnpm --filter @innlab/api start        # one-shot
pnpm --filter @innlab/api start:prod   # production mode (after build)
```

The API listens on `APP_PORT` (default 3000). Endpoints are prefixed `/api/v1/`. Swagger UI is at `/api/v1/docs` in non-production environments.

## Folder structure

```
apps/api/
├── src/
│   ├── main.ts                  # Fastify bootstrap, global pipes/filters
│   ├── app.module.ts            # composes all modules
│   ├── config/                  # env validation, ormconfig factory
│   │
│   ├── shared-kernel/           # domain primitives shared across modules
│   │   ├── domain/
│   │   │   ├── value-objects/   # UUID, LikertValue, IrlLevel
│   │   │   ├── errors/          # DomainError hierarchy
│   │   │   └── result.ts        # Result<T, E> for explicit error paths
│   │   └── application/         # use-case interface
│   │
│   ├── modules/
│   │   ├── identity/            # E-01 — Keycloak guard + InnLab Core client
│   │   ├── irl-catalog/         # read-only catalogs (dimensions, statements, conversion)
│   │   ├── consent/             # E-02 — RF-03
│   │   ├── initiative/          # E-02 — RF-04
│   │   ├── questionnaire/       # E-03 — PHASE 1 PRIORITY
│   │   ├── maturity-profile/    # E-04 — PHASE 1 PRIORITY (the calculator lives here)
│   │   ├── diagnostic/          # orchestrator / process manager
│   │   ├── audit/               # cross-cutting evento_auditoria
│   │   └── notifications/       # stub in phase 1, full in phase 2
│   │
│   ├── infrastructure/          # global infra (not module-scoped)
│   │   ├── database/
│   │   │   ├── data-source.ts
│   │   │   ├── migrations/
│   │   │   └── seeds/
│   │   ├── http/                # global filters, interceptors, pipes
│   │   └── logging/             # pino config
│   │
│   └── interfaces/http/
│       └── api-v1.module.ts     # composes controllers per API version
│
├── test/
│   ├── unit/                    # mirrors src/, no DB
│   ├── integration/             # Testcontainers + Postgres
│   └── e2e/                     # supertest against compiled app
│
├── .env.example
├── eslint.config.mjs
├── jest.config.js
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md                    # this file
```

Inside each module, the layer split is **interfaces → application → domain ← infrastructure**:

```
modules/maturity-profile/
├── domain/
│   ├── entities/                # MaturityProfile aggregate
│   ├── value-objects/           # DimensionResult, Bottleneck, ImbalancePair
│   ├── services/                # IrlCalculatorService (pure, no IO)
│   └── ports/                   # MaturityProfileRepositoryPort
├── application/
│   └── use-cases/               # ComputeMaturityProfileUseCase
├── infrastructure/
│   └── persistence/             # TypeOrmMaturityProfileRepository, ORM entities
├── interfaces/
│   └── http/                    # controllers + DTOs
└── maturity-profile.module.ts
```

For the full walk-through of every module, see [`docs/modules.md`](./docs/modules.md).

## Architecture in one paragraph

Modular monolith with DDD-lite. One NestJS module per bounded context. The **Diagnostic module is the orchestrator** — other modules never call each other directly. The domain layer imports zero framework code. Repositories implement domain ports; HTTP clients (Keycloak, InnLab Core) implement domain ports. The IRL calculator is a pure function over the conversion table, exhaustively property-tested.

## Database

Single PostgreSQL database, **two schemas**:

- `irl_catalog` — read-only at runtime. Holds dimensions, statements, conversion ranges, dimension pairs, sectors, roadmap texts, portfolio services, routing rules. Populated by seeds; the app DB role has `SELECT` only.
- `irl_diagnostic` — transactional. Holds diagnostico, iniciativa, consentimiento, respuesta, resultado_dimension, analisis_desequilibrio, recomendacion_portafolio, notificacion, descarga_reporte, evento_auditoria.

The split is enforced at the database level via role grants — defense in depth beyond application code.

**Never** enable `synchronize: true`. Schema changes go through migrations.

## Authentication

Three rules:

1. **All requests** to `/api/v1/*` (except `/health`) carry `Authorization: Bearer <JWT>`. The `KeycloakGuard` verifies the JWT locally against JWKS keys cached at boot — **no HTTP call per request**.
2. **User context** (name, email, identifier) comes from the InnLab Core API, **called once per session** and cached in memory. The call uses **service credentials** (`client_credentials`), never the user's JWT — see RNF-05.
3. **Resource authorization** is checked in use cases: `if (diagnostic.userId !== currentUser.id) throw new ForbiddenError()`. RNF-04 — no user sees another user's diagnostics.

Troubleshooting auth failures: [`docs/workflows/debugging-keycloak.md`](../../docs/workflows/debugging-keycloak.md).

## API design

REST, versioned at `/api/v1/`, resource-oriented around aggregate roots. Spanish nouns in URLs (`/diagnosticos`, `/iniciativas`, `/catalogo`), camelCase in JSON bodies, **RFC 7807 Problem Details** for errors with a project-specific `code` field.

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
test:e2e                # supertest against compiled app, mocked Keycloak/InnLab Core
test:cov                # coverage report
test:watch              # watch mode

# quality
lint                    # eslint
lint:fix                # eslint --fix
typecheck               # tsc --noEmit
format                  # prettier --write

# database
db:migration:generate -- src/infrastructure/database/migrations/<Name>
db:migration:create   -- src/infrastructure/database/migrations/<Name>
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
| E2E         | `test/e2e/`         | One spec per user story, full HTTP, mocked Keycloak/InnLab Core | < 3min          |

Coverage thresholds are scoped, not repo-wide. `modules/maturity-profile/domain/` requires **95%**. `modules/questionnaire/domain/` requires **90%**. Everything else is best-effort. The IRL calculator is property-tested with `fast-check` over the full Likert input space.

Conventions and recipes: [`docs/conventions/testing.md`](../../docs/conventions/testing.md) and [`docs/testing-recipes.md`](./docs/testing-recipes.md).

## Linting and formatting

- **ESLint** with `typescript-eslint` for type-aware rules and `eslint-plugin-boundaries` to enforce layer boundaries (domain ↛ infrastructure, etc.). Boundary violations are compile-time errors.
- **Prettier** for formatting, configured at the repo root. Don't fight it.
- Both run automatically via Husky pre-commit on staged files.
