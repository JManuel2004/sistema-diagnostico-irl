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

What is implemented: sign-in through the INNLAB SSO (HU-01/02), starting a diagnostic (HU-04), consulting a completed one from the panel (DIAGIRL-26), consent (HU-05), initiative profile (HU-06), the questionnaire with optional justifications (E-03), the maturity profile with its critical state (E-04), the deep analysis — roadmap and portfolio recommendation (RF-11), the full report on screen and in PDF, and the mail of that report to INNLAB. A simulated sign-in lets the whole flow run without Core or Cognito (see below).

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

cp apps/api/.env.example apps/api/.env       # fill in real values
cp apps/web/.env.example apps/web/.env

pnpm db:up                                    # postgres (port 5433) and the local mail inbox (1025, http://localhost:8025)

pnpm --filter @innlab/api db:migration:run    # the single schema migration
pnpm --filter @innlab/api db:seed             # IRL catalogs and routing configuration

pnpm dev                                      # boots api + web in parallel
```

You should see:

- API: <http://localhost:3000/api/v1>, Swagger UI at <http://localhost:3000/api/docs>
- Web: <http://localhost:5173>

The real values go in `.env`. `.env.local` is reserved for the simulated sign-in: it is read before `.env`, so it overrides it.

If your local database was created before a schema change, the API answers 500 with `relation "..." does not exist`. The schema lives in a single migration that is edited in place, so an existing database never picks up the change: rebuild it (this deletes all local data).

```bash
docker compose down -v
pnpm db:up
pnpm --filter @innlab/api db:migration:run
pnpm --filter @innlab/api db:seed
```

## Try it with the simulated sign-in

Without Core or Cognito, a local simulator (`tools/auth-simulator/`, port 8090) stands in for the INNLAB sign-in page, the session and the user's profile. There are no passwords: its page lists test users (`tools/auth-simulator/users.json`) and signs in as the one you pick. Never use it where real users can reach it.

1. Start the simulator. It refuses to start without the confirmation variable:

   ```bash
   AUTH_SIMULATOR_CONFIRM=simulated-sign-in-only pnpm auth:simulated:up
   ```

2. Create `apps/api/.env.local`:

   ```dotenv
   COGNITO_JWKS_URI=http://localhost:8090/.well-known/jwks.json
   COGNITO_ISSUER=http://localhost:8090
   INNLAB_API_BASE_URL=http://localhost:8090/api
   CORE_INTERNAL_KEY=simulated-internal-key
   ```

3. Create `apps/web/.env.local`:

   ```dotenv
   VITE_CORE_URL=http://localhost:8090
   VITE_CORE_API_URL=http://localhost:8090/api
   ```

4. Restart `pnpm dev` (both apps read their env files only at start-up) and open <http://localhost:5173>. «Iniciar diagnóstico» now opens the simulator's page, marked «Modo simulado».

Restarting the simulator signs everyone out, because its signing key is generated at start-up. The finished report mail lands in the local inbox at <http://localhost:8025>.

**Back to the real sign-in:** delete both `.env.local` files, restart `pnpm dev` and stop the simulator:

```bash
docker compose --profile simulated stop auth-simulator
```

The details and the safeguards are in [`docs/workflows/LOCAL-SETUP.md`](./docs/workflows/LOCAL-SETUP.md), step 5c.

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
| Run the pipeline or deploy locally            | [`docs/workflows/CI-JENKINS.md`](./docs/workflows/CI-JENKINS.md)                       |
| Use the app without Core or Cognito           | [`docs/workflows/LOCAL-SETUP.md`](./docs/workflows/LOCAL-SETUP.md), step 5c (simulated sign-in) |
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
