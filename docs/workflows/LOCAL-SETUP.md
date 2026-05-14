# Local Setup

How a new developer gets from a blank laptop to a running stack. This is the document you open on day one.

If at any step something fails, check [`docs/troubleshooting.md`](../troubleshooting.md) before asking the team — most blockers are listed there.

## What you'll have running at the end

- **Backend** (`@innlab/api`) on <http://localhost:3000>
- **Frontend** (`@innlab/web`) on <http://localhost:5173>
- **PostgreSQL** on `localhost:5432`
- **Keycloak** on <http://localhost:8080>
- **Mailpit** (SMTP catcher) on <http://localhost:8025>

Estimated time: **30–45 minutes** the first time, including a Docker pull. Subsequent starts are under 2 minutes.

## Prerequisites

### Required tools

| Tool           | Version      | Install                                                                                                                                    |
| -------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Node.js        | **22.x LTS** | [nvm](https://github.com/nvm-sh/nvm) (mac/Linux) or [nvs](https://github.com/jasongin/nvs) (Windows). The repo's `.nvmrc` pins the version |
| pnpm           | **9.x**      | Installed via Corepack (ships with Node)                                                                                                   |
| Docker Desktop | latest       | <https://www.docker.com/products/docker-desktop>                                                                                           |
| Git            | 2.40+        | Standard install                                                                                                                           |

### Recommended

- **VS Code** with the workspace's recommended extensions (auto-suggested when you open the repo).
- A modern terminal that supports ANSI colors. Built-in macOS Terminal or Windows Terminal both work.

### Verify the prerequisites

```bash
node --version            # should print v22.x.x
corepack enable
corepack prepare pnpm@9 --activate
pnpm --version            # should print 9.x.x
docker --version
docker compose version
git --version
```

If any of these fail, fix it before continuing. A wrong Node version is the single most common cause of weird errors later.

### Windows-specific

- **Don't put the repo in a OneDrive folder.** OneDrive's file-locking interferes with `node_modules` and causes lockfile churn.
- **Don't put the repo in a path with spaces.** Several npm postinstall scripts don't escape spaces correctly on Windows. Use `C:\dev\diagnostico-irl` or similar.
- **Use Git Bash or PowerShell**, not legacy `cmd.exe`.

## Step 1 — Clone

```bash
git clone <repo-url> diagnostico-irl
cd diagnostico-irl
git checkout dev   # always work off dev, never main
```

## Step 2 — Install dependencies

From the repo root:

```bash
pnpm install
```

This installs every dependency for every workspace package (api, web, contracts, plus the root tooling). The first install pulls ~1.2 GB into a pnpm content-addressable store, but subsequent installs across other projects reuse the same store.

If install fails with `opencollective` errors or similar postinstall failures on Windows, see [`docs/troubleshooting.md#pnpm-install-fails-on-windows`](../troubleshooting.md#pnpm-install-fails-on-windows).

## Step 3 — Build the shared contracts package

The apps import compiled output from `@innlab/contracts`. Build it once:

```bash
pnpm --filter @innlab/contracts build
```

You'll re-run this whenever the schemas change. The contracts package has a `dev` script that watches and rebuilds, useful if you're actively editing schemas:

```bash
pnpm --filter @innlab/contracts dev   # optional, watch mode
```

## Step 4 — Configure environment variables

### Backend

```bash
cp apps/api/.env.example apps/api/.env.local
```

Open `apps/api/.env.local` and review:

| Variable                            | What to set                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`                      | Leave as-is; matches the docker-compose Postgres                            |
| `KEYCLOAK_ISSUER_URL`               | Leave as-is; matches the docker-compose Keycloak                            |
| `KEYCLOAK_AUDIENCE`                 | `diagnostico-irl-api`                                                       |
| `INNLAB_CORE_BASE_URL`              | For local dev, use the mock server at `http://localhost:8081` (see Step 5b) |
| `INNLAB_CORE_CLIENT_ID` / `_SECRET` | Use any values; the local mock doesn't validate them                        |
| `SMTP_HOST` / `_PORT`               | Leave as-is; matches Mailpit                                                |
| `LOG_LEVEL`                         | `debug` for local dev                                                       |

Full variable reference: [`docs/environments/env-variables.md`](../environments/env-variables.md).

### Frontend

```bash
cp apps/web/.env.example apps/web/.env.local
```

Open `apps/web/.env.local`:

| Variable                 | What to set                                             |
| ------------------------ | ------------------------------------------------------- |
| `VITE_API_BASE_URL`      | Leave as `/api/v1` — Vite proxies to the backend in dev |
| `VITE_OIDC_AUTHORITY`    | `http://localhost:8080/realms/innlab-dev`               |
| `VITE_OIDC_CLIENT_ID`    | `diagnostico-irl-web`                                   |
| `VITE_OIDC_REDIRECT_URI` | `http://localhost:5173/auth/callback`                   |

## Step 5 — Start supporting services

### 5a. Database, Keycloak, and Mailpit

The repo ships a single `docker-compose.dev.yml` at the root. Convenience scripts wrap it:

```bash
pnpm db:up          # starts postgres
pnpm keycloak:up    # starts keycloak

# or all at once:
docker compose -f docker-compose.dev.yml up -d
```

Check they're healthy:

```bash
docker compose -f docker-compose.dev.yml ps
```

You should see `postgres`, `keycloak`, and `mailpit` with status `running` (postgres should also say `healthy` after ~10s).

### 5b. Keycloak realm import — first-time only

Keycloak boots with an empty admin account by default. The repo includes a pre-configured realm export under `.docker/keycloak/innlab-dev-realm.json` that defines:

- The `innlab-dev` realm.
- The `diagnostico-irl-api` client (audience for backend JWT validation).
- The `diagnostico-irl-web` client (public, PKCE, for the SPA).
- A test user (`test@innlab.icesi.edu.co` / password `password`).

The compose file mounts the export directory so Keycloak auto-imports on first boot. If you don't see the realm in the admin UI, see [`docs/workflows/debugging-keycloak.md`](./debugging-keycloak.md).

Verify by going to <http://localhost:8080/realms/innlab-dev/.well-known/openid-configuration> — you should see a JSON response.

### 5c. InnLab Core mock — first-time only

The real InnLab Core API isn't accessible from local development. The repo includes a minimal mock server. From a separate terminal:

```bash
cd tools/innlab-core-mock
pnpm install
pnpm start    # listens on :8081
```

The mock responds to `POST /oauth/token` (returns a fake service token) and `GET /users/:id` (returns canned user contexts). It's enough to exercise the local flow end-to-end.

## Step 6 — Apply database migrations and seeds

```bash
pnpm --filter @innlab/api db:migration:run
pnpm --filter @innlab/api db:seed
```

The seed populates:

- 6 dimensions (TRL, CRL, BRL, IPRL, TmRL, FRL).
- 48 statements (8 per dimension).
- The conversion table (9 rows from 1.00–1.39 → 1 through 4.40–5.00 → 9).
- 6 dimension pairs for imbalance evaluation.
- Sector taxonomy for the initiative form.
- Roadmap texts (for phase 2 — loaded for completeness).
- Portfolio services and routing rules (for phase 2).

Seeds are **idempotent** — running them again won't duplicate data.

Verify with `psql`:

```bash
docker exec -it irl-postgres psql -U irl_user -d irl_diagnostic
```

```sql
SET search_path TO irl_catalog;
SELECT COUNT(*) FROM dimension;        -- expect 6
SELECT COUNT(*) FROM afirmacion;       -- expect 48
SELECT COUNT(*) FROM rango_conversion; -- expect 9
\q
```

## Step 7 — Start the apps

From the repo root:

```bash
pnpm dev
```

This starts the backend and frontend in parallel with hot reload. Output is interleaved with package prefixes (`@innlab/api:` and `@innlab/web:`) so you can tell what came from where.

Alternatively, in separate terminals:

```bash
pnpm --filter @innlab/api dev
pnpm --filter @innlab/web dev
```

## Step 8 — Verify

Open the apps:

- API health: <http://localhost:3000/health/live> should return `{"status":"ok"}`.
- API docs: <http://localhost:3000/api/v1/docs> should render Swagger UI.
- Frontend: <http://localhost:5173> should redirect to Keycloak. Sign in with `test@innlab.icesi.edu.co` / `password`.
- After sign-in: you should land on the home page, then be able to start a new diagnostic.

Mailpit UI is at <http://localhost:8025> — any email the backend sends shows up here.

## Day-to-day after first setup

You don't repeat the whole flow each morning. Typical loop:

```bash
git checkout dev && git pull
pnpm install                # only if package.json changed (it almost always has)
pnpm db:up && pnpm keycloak:up   # if you stopped them
pnpm dev
```

When you finish for the day:

```bash
docker compose -f docker-compose.dev.yml stop    # stop containers without removing data
```

Use `down` instead of `stop` if you want to clear the local DB:

```bash
docker compose -f docker-compose.dev.yml down -v   # -v also wipes the postgres volume
```

## Common first-time issues

### "Port 5432 is already allocated"

You have another Postgres running. Either stop it, or change `POSTGRES_PORT` in `docker-compose.dev.yml` and update `DATABASE_URL` in `.env.local` to match.

### "Cannot find module '@innlab/contracts'" in api or web

You forgot Step 3. Run `pnpm --filter @innlab/contracts build`.

### "Invalid token signature" when the SPA calls the API

Keycloak hadn't finished booting when the backend started, so the JWKS fetch returned empty. Restart the backend (`pnpm --filter @innlab/api dev`). Keycloak takes ~15s to be ready on first boot.

### "EACCES" on macOS/Linux when running `pnpm install`

You installed Node with `sudo` at some point. Best fix: uninstall it and reinstall via `nvm` (which keeps everything in your home directory).

### Hot reload doesn't pick up backend changes

The backend uses `nest start --watch`, which watches `src/`. If you're editing test files or other things outside `src/`, restart manually.

### Vite hot reload is slow

Disable browser-side source maps in dev tools (Settings → Sources → Disable source maps). Vite's source maps work either way; what slows reload is the browser repainting them.

## Next steps

Once your stack runs pick a low-risk ticket and walk through [`docs/workflows/daily-development.md`](./daily-development.md) end to end.
