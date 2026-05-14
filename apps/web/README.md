# @innlab/web — Frontend

The IRL Diagnostic System SPA. **React 18 + Vite 5 + TypeScript**, with **TanStack Query** for server state, **Zustand** for the questionnaire draft, **React Hook Form + Zod** for forms, **Recharts** for the radar chart, and **Radix UI** for accessible primitives.

This README is for frontend developers. For the system overview, see the [root README](../../README.md).

## Stack

| Concern        | Choice                                                           |
| -------------- | ---------------------------------------------------------------- |
| Build          | Vite 5                                                           |
| Framework      | React 18                                                         |
| Routing        | React Router 6                                                   |
| Server state   | TanStack Query 5                                                 |
| Local/UI state | Zustand (with `persist` middleware for the questionnaire draft)  |
| Forms          | React Hook Form + Zod via `@hookform/resolvers`                  |
| Auth           | `react-oidc-context` (OIDC + PKCE S256)                          |
| Visualization  | Recharts (radar chart)                                           |
| UI primitives  | Radix UI (dialog, radio-group, tabs)                             |
| Toasts         | Sonner                                                           |
| Icons          | Lucide React                                                     |
| Testing        | Vitest + Testing Library; Playwright for E2E; MSW for HTTP mocks |

## First-time setup

From the **repo root**:

```bash
pnpm install
pnpm --filter @innlab/contracts build
cp apps/web/.env.example apps/web/.env.local
# edit apps/web/.env.local with real values
pnpm --filter @innlab/web dev
```

Walkthrough: [`docs/workflows/local-setup.md`](../../docs/workflows/local-setup.md).

## Run

```bash
pnpm --filter @innlab/web dev          # Vite dev server on :5173
pnpm --filter @innlab/web build        # production build
pnpm --filter @innlab/web preview      # serve the built bundle locally
```

In dev mode, Vite proxies `/api/v1/*` to `http://localhost:3000` so the SPA can call the API without CORS. In production both apps sit behind a reverse proxy; the proxy disappears.

## Folder structure

```
apps/web/
├── src/
│   ├── main.tsx                    # entry point
│   ├── App.tsx                     # composes providers + router
│   │
│   ├── app/                        # app shell — providers, router, i18n
│   │   ├── providers/              # QueryProvider, AuthProvider, ErrorBoundary, ToastProvider
│   │   ├── router/                 # routes.tsx, ProtectedRoute, DiagnosticGuard
│   │   └── i18n/                   # (locked to es-CO for MVP)
│   │
│   ├── pages/                      # one component per route, composes features
│   │   ├── HomePage.tsx
│   │   ├── ConsentPage.tsx
│   │   ├── InitiativePage.tsx
│   │   ├── QuestionnairePage.tsx          # E-03 — PHASE 1 PRIORITY
│   │   ├── MaturityProfilePage.tsx        # E-04 — PHASE 1 PRIORITY
│   │   ├── NotFoundPage.tsx
│   │   └── UnauthorizedPage.tsx
│   │
│   ├── features/                   # one folder per bounded UI capability
│   │   ├── auth/
│   │   ├── consent/
│   │   ├── initiative/
│   │   ├── questionnaire/                 # E-03 — PHASE 1 PRIORITY
│   │   ├── maturity-profile/              # E-04 — PHASE 1 PRIORITY
│   │   └── diagnostic/
│   │
│   ├── shared/                     # cross-feature primitives only
│   │   ├── ui/                     # Button, TextField, Dialog, ...
│   │   ├── api/                    # http.ts, query-keys.ts, problem-details.ts
│   │   ├── lib/                    # invariants, result types
│   │   ├── hooks/                  # generic hooks (useDebouncedValue, ...)
│   │   ├── types/                  # cross-feature TS types
│   │   └── config/                 # typed env access
│   │
│   ├── styles/
│   │   ├── globals.css
│   │   └── tokens.css              # design tokens
│   │
│   └── test/
│       ├── setup.ts                # Vitest setup
│       ├── msw/                    # MSW handlers
│       └── fixtures/
│
├── tests/
│   └── e2e/                        # Playwright specs
│
├── .env.example
├── eslint.config.mjs
├── package.json
├── playwright.config.ts
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── README.md                       # this file
```

A feature folder has this shape (filled in as needed):

```
features/questionnaire/
├── api/                # API client functions + types
├── components/         # feature-private components
├── hooks/              # feature-private React hooks
├── store/              # zustand stores (if any)
├── schemas/            # zod schemas (consume from @innlab/contracts when shared)
├── utils/              # pure helpers
└── index.ts            # public surface (barrel)
```

**Rule:** features cannot import from each other. ESLint enforces this. Cross-feature reuse goes through `shared/`. The full feature map is in [`docs/features.md`](./docs/features.md).

## State management

Two distinct tools, two distinct concerns:

| State category                                 | Tool                                         | Examples                                          |
| ---------------------------------------------- | -------------------------------------------- | ------------------------------------------------- |
| Server state                                   | TanStack Query                               | Catalogs, diagnostic detail, maturity profile     |
| Questionnaire draft + cross-component UI state | Zustand (with `persist` to `sessionStorage`) | The 48 in-progress answers, current dimension tab |
| Local component state                          | `useState`                                   | Modal open/closed, input focus                    |

**Never mix the two for the same piece of state.** Full discussion: [`docs/state-management.md`](./docs/state-management.md).

## API integration

Single axios instance in `shared/api/http.ts`, two interceptors: request adds JWT + correlation ID, response parses RFC 7807 problem documents.

Each feature owns its API module under `features/<name>/api/`. API functions return typed promises; React Query handles caching and refetching. Zod schemas from `@innlab/contracts` parse responses at the boundary, so backend contract drift fails loudly in development.

```ts
// features/questionnaire/api/questionnaire.api.ts
import { http } from '@shared/api/http';
import { maturityProfileResponseSchema, type SubmitCommand } from '@innlab/contracts';

export async function submitQuestionnaire(cmd: SubmitCommand) {
  const { data } = await http.post(`/diagnosticos/${cmd.diagnosticId}/cuestionario/envio`, {
    answers: cmd.answers,
  });
  return maturityProfileResponseSchema.parse(data);
}
```

## Routing

React Router 6, with two route element layers:

- **`ProtectedRoute`** — requires an authenticated Keycloak session. Redirects to login otherwise.
- **`DiagnosticGuard`** — enforces the diagnostic state machine. You can't reach `/diagnosticos/:id/cuestionario` until the user has consented and registered an initiative.

Route map:

```
/                                       HomePage
/login                                  → OIDC redirect (no component)
/auth/callback                          → OIDC callback handler
/diagnosticos                           HomePage (list + start new)
/diagnosticos/nuevo                     ConsentPage
/diagnosticos/:id/consentimiento        ConsentPage
/diagnosticos/:id/iniciativa            InitiativePage
/diagnosticos/:id/cuestionario          QuestionnairePage
/diagnosticos/:id/perfil                MaturityProfilePage
/403                                    UnauthorizedPage
/404                                    NotFoundPage
```

## Forms

| Form                           | Tool                  | Why                                                                                                     |
| ------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------- |
| Consent (1 checkbox)           | React Hook Form + Zod | Standard form pattern                                                                                   |
| Initiative (3 fields)          | React Hook Form + Zod | Standard form pattern                                                                                   |
| **Questionnaire (48 answers)** | Zustand + Zod         | RHF is the wrong tool for 48 cross-component fields. The Zustand store drives both data and progress UI |

Zod schemas for cross-tier shapes live in `@innlab/contracts`; the frontend imports them and uses them with `@hookform/resolvers/zod`.

## UI primitives

`shared/ui/` holds stateless, domain-agnostic primitives only: `Button`, `TextField`, `Select`, `Dialog`, `Spinner`, `Toast`, `EmptyState`, `ErrorState`. Each is built on a Radix primitive when accessibility matters (radio groups, dialogs, tabs). Styling uses CSS Modules + design tokens — no Tailwind.

Domain-specific components (`LikertScale`, `RadarChart`, `DimensionTabs`) stay in their owning feature. Promotion to `shared/ui/` requires a **second** feature legitimately needing the component.

## Testing

```bash
pnpm --filter @innlab/web test          # vitest run, unit + component
pnpm --filter @innlab/web test:watch    # watch mode
pnpm --filter @innlab/web test:cov      # coverage
pnpm --filter @innlab/web test:e2e      # playwright
pnpm --filter @innlab/web test:e2e:ui   # playwright UI mode
```

Conventions and what to test where: [`docs/conventions/testing.md`](../../docs/conventions/testing.md).

## Linting and formatting

- ESLint with `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y` (accessibility errors block CI), and `eslint-plugin-boundaries` (features can't import from each other).
- Prettier formats on save (recommend installing the Prettier VS Code extension).
- Both run via Husky pre-commit.

## Environment variables

Vite exposes only variables prefixed `VITE_`. Documented in [`.env.example`](./.env.example) and [`docs/environments/env-variables.md`](../../docs/environments/env-variables.md).

## Suggested scripts

```bash
dev                    # vite dev server
build                  # tsc --noEmit + vite build
preview                # serve dist/ locally
lint, lint:fix         # eslint
typecheck              # tsc --noEmit
format                 # prettier --write
test, test:watch       # vitest
test:cov               # coverage report
test:e2e, test:e2e:ui  # playwright
```
