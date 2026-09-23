# IRL Diagnostic System

Web application for diagnosing the maturity level of digital innovation initiatives using the **KTH Innovation Readiness Level (IRL)** framework. Built for the **INNLAB** center at Universidad Icesi as a degree project.

The leader of an innovation initiative registers the initiative, accepts the data-processing consent and answers a 48-statement questionnaire organized across six dimensions (TRL, CRL, BRL, IPRL, TmRL, FRL), justifying each answer. The system computes a maturity profile on a 1-to-9 scale per dimension, identifies the bottleneck, the gaps and the imbalances between dimensions and, when the user asks for the deep analysis, produces a scaling roadmap and a recommendation from INNLAB's service portfolio, each with its explanation.

This README is the repository entry point. Five minutes to context, then it points you elsewhere.

## What's in this repo

A pnpm monorepo with three packages:

| Path                 | Package             | What it is                                                                          |
| -------------------- | ------------------- | ----------------------------------------------------------------------------------- |
| `apps/api`           | `@innlab/api`       | NestJS 11 backend — REST API on Fastify, PostgreSQL via TypeORM, Cognito JWTs       |
| `apps/web`           | `@innlab/web`       | React 19 + Vite SPA — the diagnostic wizard, the results page and the panel         |
| `packages/contracts` | `@innlab/contracts` | Shared Zod schemas — single source of truth for request and response shapes         |

The architecture is a **modular monolith with DDD-lite**: one NestJS module per bounded context (`diagnosis`, `initiative`, `routing`, `roadmap`, plus `shared/irl-taxonomy` and `shared/identity`). Modules react to each other through in-process domain events and read from each other only through exported queries; the domain and application layers import no framework. The why of each of these choices is in [`docs/architecture/`](./docs/architecture/README.md).

What is implemented: sign-in through the INNLAB SSO (HU-01/02), starting or resuming a diagnostic (HU-04), consent (HU-05), initiative profile (HU-06), the questionnaire with justifications (E-03), the maturity profile with its critical state (E-04), and the deep analysis — roadmap and portfolio recommendation (RF-11). Reporting and notifications are not built.

## Prerequisites

- **Node.js ≥ 24.9** (see `.nvmrc` and `engines`; `.npmrc` refuses older versions). Older versions cannot run the test suites: `jose`/`jwks-rsa` load ESM through `require()`, which Jest only supports from Node 24.9
- **pnpm 9.x** (declared in `packageManager`, installed via Corepack)
- **Docker** — for the local PostgreSQL and the integration tests

```bash
node --version    # v24.9 or newer
corepack enable
corepack prepare pnpm@9 --activate
pnpm --version    # 9.x.x
docker --version
```

## Get it running locally

The first time, read [`docs/workflows/LOCAL-SETUP.md`](./docs/workflows/LOCAL-SETUP.md) — it covers the Cognito values and the INNLAB Core internal key you need from the Core team.

The short version:

```bash
pnpm install                                  # installs all workspace packages
pnpm --filter @innlab/contracts build         # build shared contracts first

cp apps/api/.env.example apps/api/.env.local  # fill in real values
cp apps/web/.env.example apps/web/.env.local

pnpm db:up                                    # start postgres in docker (port 5433)

pnpm --filter @innlab/api db:migration:run    # the single schema migration
pnpm --filter @innlab/api db:seed             # IRL catalogs and routing configuration

pnpm dev                                      # boots api + web in parallel
```

You should see:

- API: <http://localhost:3000/api/v1>, Swagger UI at <http://localhost:3000/api/docs>
- Web: <http://localhost:5173>

## Common commands

Run from the repo root. The `-r` flag means "run in every workspace package that defines this script."

```bash
pnpm dev                  # start both apps in dev mode with hot reload
pnpm build                # build all packages
pnpm test                 # all tests (api: unit + integration + e2e; web: vitest)
pnpm test:unit            # fast: unit tests only
pnpm lint                 # eslint across the repo
pnpm typecheck            # type-only check, no emit
pnpm format               # prettier --write across the repo
```

Package-scoped commands use `--filter`:

```bash
pnpm --filter @innlab/api test:integration   # needs Docker
pnpm --filter @innlab/web test:e2e           # Playwright
pnpm --filter @innlab/contracts build
```

The Husky git hooks are configured but inactive (`.npmrc` sets `ignore-scripts`): run `pnpm lint` and `pnpm typecheck` before committing.

## Where to read next

| I want to...                                  | Go to                                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| Set up my machine for the first time          | [`docs/workflows/LOCAL-SETUP.md`](./docs/workflows/LOCAL-SETUP.md)                     |
| Know the day-to-day flow                      | [`docs/workflows/DAILY-DEVELOPMENT.md`](./docs/workflows/DAILY-DEVELOPMENT.md)         |
| Understand the architecture and its decisions | [`docs/architecture/README.md`](./docs/architecture/README.md)                         |
| Follow a diagnostic from start to results     | [`docs/architecture/diagnostic-flow.md`](./docs/architecture/diagnostic-flow.md)       |
| Work on the backend                           | [`apps/api/README.md`](./apps/api/README.md), then the module's own `README.md`        |
| Work on the frontend                          | [`apps/web/README.md`](./apps/web/README.md)                                           |
| Change a shared request or response shape     | [`packages/contracts/README.md`](./packages/contracts/README.md)                       |
| Follow the code, API and testing conventions  | [`docs/conventions/`](./docs/conventions/CODE-STYLE.md)                                |
| Name a branch or write a commit message       | [`BRANCH-NOTATION.md`](./docs/conventions/BRANCH-NOTATION.md), [`STANDARD-COMMIT.md`](./docs/conventions/STANDARD-COMMIT.md) |

If a doc is missing or out of date, **fix it in the same change that exposed the gap.** Documentation rot is the most common silent failure mode on small teams.

## License

The KTH Innovation Readiness Level™ framework — the dimensions, levels, statements, and conversion table — is licensed under **CC BY-NC-SA 4.0** by KTH Innovation, and the system displays attribution on every results view as required (RNF-09).
