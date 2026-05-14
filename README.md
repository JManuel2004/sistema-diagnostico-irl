# IRL Diagnostic System

Web application for diagnosing the maturity level of digital innovation initiatives using the **KTH Innovation Readiness Level (IRL)** framework. Built for the **INNLAB** center at Universidad Icesi as a degree project.

A leader of an innovation initiative answers a 48-statement questionnaire organized across six dimensions (TRL, CRL, BRL, IPRL, TmRL, FRL). The system computes a maturity profile on a 1-to-9 scale per dimension, identifies bottlenecks and imbalances between dimensions, and — optionally — produces a roadmap of improvement orientations and a recommendation from INNLAB's service portfolio.

This README is the repository entry point. Five minutes to context, then it points you elsewhere.

## What's in this repo

This is a pnpm monorepo with three packages:

| Path                 | Package             | What it is                                                                      |
| -------------------- | ------------------- | ------------------------------------------------------------------------------- |
| `apps/api`           | `@innlab/api`       | NestJS backend — REST API on Fastify, PostgreSQL via TypeORM, Keycloak for auth |
| `apps/web`           | `@innlab/web`       | React + Vite SPA — questionnaire UI and radar profile visualization             |
| `packages/contracts` | `@innlab/contracts` | Shared Zod schemas — single source of truth for request/response shapes         |

The architecture is a **modular monolith with DDD-lite**: one NestJS module per bounded context, a process-manager orchestrator coordinating the diagnostic flow, hexagonal ports/adapters where the discipline pays off (calculation engine, InnLab Core client, mailer).

Phase 1 scope covers user stories from epics **E-03 (Cuestionario IRL)** and **E-04 (Diagnóstico inicial de madurez)**. Other epics are scaffolded but not implemented.

## Prerequisites

Lock these versions or use `nvm`/Corepack to pin them automatically:

- **Node.js 22.x LTS** (see `.nvmrc`)
- **pnpm 9.x** (declared in `packageManager` field, installed via Corepack)
- **Docker** — required for local Postgres, Keycloak, and Mailpit

Verify:

```bash
node --version    # v22.x.x
corepack enable
corepack prepare pnpm@9 --activate
pnpm --version    # 9.x.x
docker --version
```

## Get it running locally

If this is your first time, read [`docs/workflows/local-setup.md`](./docs/workflows/local-setup.md) — it covers the gotchas (Keycloak realm import, Windows path issues, InnLab Core mock).

The short version:

```bash
git clone <repo-url> diagnostico-irl
cd diagnostico-irl
pnpm install                                  # installs all workspace packages
pnpm --filter @innlab/contracts build         # build shared contracts first

cp apps/api/.env.example apps/api/.env.local  # fill in real values
cp apps/web/.env.example apps/web/.env.local

pnpm db:up                                    # start postgres in docker
pnpm keycloak:up                              # start keycloak in docker

pnpm --filter @innlab/api db:migration:run    # apply migrations
pnpm --filter @innlab/api db:seed             # load IRL catalogs

pnpm dev                                      # boots api + web in parallel
```

You should see:

- API: <http://localhost:3000>, Swagger at <http://localhost:3000/api/v1/docs>
- Web: <http://localhost:5173>
- Keycloak admin: <http://localhost:8080> (admin/admin)
- Mailpit UI: <http://localhost:8025>

## Common commands

Run from the repo root unless noted. The `-r` flag means "run in every workspace package that defines this script."

```bash
pnpm dev                  # start both apps in dev mode with hot reload
pnpm build                # build all packages
pnpm test                 # run all tests (unit + integration + e2e)
pnpm test:unit            # fast: unit tests only
pnpm lint                 # eslint across the repo
pnpm typecheck            # type-only check, no emit
pnpm format               # prettier --write across the repo
```

Package-scoped commands use `--filter`:

```bash
pnpm --filter @innlab/api dev
pnpm --filter @innlab/web test:e2e
pnpm --filter @innlab/contracts build
```

## Where to read next

Pick by intent:

| I want to...                         | Go to                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| Set up my machine for the first time | [`docs/workflows/local-setup.md`](./docs/workflows/local-setup.md)             |
| Name a branch correctly              | [`docs/conventions/BRANCH-NOTATION.md`](./docs/conventions/BRANCH-NOTATION.md) |
| Write a commit message               | [`docs/conventions/STANDARD-COMMIT.md`](./docs/conventions/STANDARD-COMMIT.md) |
| Work on the backend                  | [`apps/api/README.md`](./apps/api/README.md)                                   |
| Work on the frontend                 | [`apps/web/README.md`](./apps/web/README.md)                                   |

This documentation is based on ho
If a doc is missing or out of date, **fix it in the same PR that exposed the gap.** Documentation rot is the most common silent failure mode on small teams.

## License

The KTH Innovation Readiness Level™ framework — the dimensions, levels, statements, and conversion table — is licensed under **CC BY-NC-SA 4.0** by KTH Innovation, and the system displays attribution on every results view as required (RNF-09).
