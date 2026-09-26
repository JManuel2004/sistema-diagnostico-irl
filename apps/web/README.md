# @innlab/web — Frontend

The IRL Diagnostic System SPA. **React 19 + Vite 5 + TypeScript**, with **TanStack Query** for server state, **Zustand** for browser drafts, **React Hook Form + Zod** for the initiative form, **Recharts** for the radar chart and **Radix UI** for accessible primitives.

This README is for frontend developers. For the system overview, see the [root README](../../README.md); for the architecture and its decisions, [`docs/architecture/`](../../docs/architecture/README.md); for the feature map and the results page, [`docs/MODULES.md`](./docs/MODULES.md).

## Stack

| Concern        | Choice                                                                     |
| -------------- | -------------------------------------------------------------------------- |
| Build          | Vite 5                                                                     |
| Framework      | React 19                                                                   |
| Routing        | React Router 7 (`react-router-dom`)                                        |
| Server state   | TanStack Query 5                                                           |
| Draft state    | Zustand with `persist` to `sessionStorage` (questionnaire, initiative)     |
| Forms          | React Hook Form + `@hookform/resolvers/zod` (initiative form)              |
| HTTP           | axios, responses parsed with the `@innlab/contracts` Zod schemas           |
| Auth           | INNLAB SSO against Core (no OIDC library; Cognito through the Hub)         |
| Visualization  | Recharts (radar chart)                                                     |
| UI primitives  | Radix UI (radio-group, tabs, tooltip) + Tailwind + CVA                     |
| Toasts         | Sonner, through `shared/ui/notify.ts`                                      |
| Icons          | Lucide React                                                               |
| Testing        | Vitest + Testing Library + MSW; Playwright for the browser end-to-end flow |

## First-time setup

From the **repo root**:

```bash
pnpm install
pnpm --filter @innlab/contracts build
cp apps/web/.env.example apps/web/.env.local
# edit apps/web/.env.local with real values
pnpm --filter @innlab/web dev
```

Walkthrough: [`docs/workflows/LOCAL-SETUP.md`](../../docs/workflows/LOCAL-SETUP.md).

## Run

```bash
pnpm --filter @innlab/web dev          # Vite dev server on :5173
pnpm --filter @innlab/web build        # typecheck + production build
pnpm --filter @innlab/web preview      # serve the built bundle locally
```

In dev mode, Vite proxies `/api` to `http://localhost:3000` so the SPA can call the API without CORS.

## Folder structure

```
apps/web/
├── src/
│   ├── main.tsx                    # entry point
│   ├── app/
│   │   ├── App.tsx                 # composes providers + router
│   │   ├── providers/              # QueryProvider, ErrorBoundary, ToastProvider (Sonner)
│   │   └── router/                 # routes.tsx, ProtectedRoute
│   │
│   ├── pages/                      # one component per route, composes features
│   │   ├── LandingPage.tsx  AuthCallbackPage.tsx  StartDiagnosticPage.tsx
│   │   ├── DiagnosticWizardPage.tsx
│   │   ├── wizard/                 # InitiativeStep, ConsentStep, QuestionnaireStep, SummaryStep
│   │   ├── ResultsPage.tsx  DashboardPage.tsx  InitiativePage.tsx
│   │   └── NotFoundPage.tsx
│   │
│   ├── features/                   # one folder per UI capability (see docs/MODULES.md)
│   │   ├── auth/  consent/  initiative/  questionnaire/
│   │   └── maturity-profile/  portfolio-recommendation/  scaling-roadmap/
│   │
│   ├── shared/                     # cross-feature code only
│   │   ├── api/                    # http.ts (axios + getParsed/postParsed), query keys and client, diagnostic.api.ts
│   │   ├── auth/                   # the SSO session (localStorage)
│   │   ├── hooks/                  # diagnostic queries and mutations used by several pages
│   │   ├── lib/                    # paths, format, copy, palette, dimensions, glossary, cn()
│   │   └── ui/                     # primitives and brand pieces (Button, Card, Field, PageShell, notify, ...)
│   │
│   ├── dev/                        # AgroConecta autofill, only when VITE_DEV_AUTOFILL is set at build time
│   ├── styles/globals.css          # Tailwind directives + theme custom properties
│   └── test/                       # Vitest setup, fixtures, renderWithClient
│
├── tests/e2e/                      # Playwright specs
├── docs/                           # MODULES.md, STATE_MANAGEMENT.md
├── .env.example  .env.development  .env.test
├── eslint.config.mjs  playwright.config.ts  tailwind.config.ts
├── vite.config.ts  vitest.config.js  tsconfig*.json
└── README.md                       # this file
```

A feature folder has this shape (only the folders it needs):

```
features/<name>/
├── api/          # API functions, parsed with @innlab/contracts
├── components/   # feature-private components
├── hooks/        # React Query hooks and other feature hooks
├── store/        # Zustand drafts (if any)
├── lib/ utils/   # pure helpers
└── index.ts      # public surface: pages import only from here
```

**Rule:** features cannot import from each other (enforced by `eslint-plugin-boundaries`). Cross-feature reuse goes through `shared/`; a page may compose several features.

## State management

| State category        | Tool                                          | Examples                                                    |
| --------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| Server state          | TanStack Query                                | Catalogs, diagnostic, profile, recommendation, roadmap      |
| Browser drafts        | Zustand with `persist` to `sessionStorage`    | The 48 in-progress answers; the initiative before consent   |
| Local component state | `useState`, React Hook Form                   | The initiative form, the radar highlight, open panels       |

**Never mix the two for the same piece of state.** Details: [`docs/STATE_MANAGEMENT.md`](./docs/STATE_MANAGEMENT.md).

## API integration

One axios instance in `shared/api/http.ts`: the request interceptor adds the session's access token, the response interceptor turns RFC 7807 problem documents into `ApiError` (`isApiErrorWithStatus(error, 404)` narrows them). `getParsed`, `getParsedOrNull` (404 → `null`) and `postParsed` call and parse the response with a `@innlab/contracts` schema in one step, so contract drift fails loudly.

```ts
// features/scaling-roadmap/api/roadmap.api.ts
export function getScalingRoadmap(diagnosticId: string): Promise<RoadmapResponse> {
  return getParsed(`/diagnostics/${diagnosticId}/roadmap`, roadmapResponseSchema);
}
```

Each feature owns its API module under `features/<name>/api/`; calls several pages need (start, read, finalize a diagnostic) live in `shared/api/diagnostic.api.ts` with their hooks in `shared/hooks/`. After a mutation that changes a diagnostic, `invalidateDiagnostic` refreshes it.

## Routing

- **`ProtectedRoute`** requires an INNLAB session and otherwise sends the user to the Hub's SSO; `/auth/callback` stays outside it.
- **The wizard** (`DiagnosticWizardPage`) decides the step from what the server already has; see [the diagnostic flow](../../docs/architecture/diagnostic-flow.md).
- Every path is built with `shared/lib/paths.ts`, never by hand. Route paths are user-visible URLs and stay in Spanish.

```
/                                       LandingPage (public, no navigation)
/auth/callback                          AuthCallbackPage (public: exchanges ?code=)
/diagnosticos/nuevo                     StartDiagnosticPage (starts or resumes, opens the wizard)
/diagnosticos/:id/asistente/:step?      DiagnosticWizardPage (iniciativa, consentimiento, cuestionario, resumen)
/diagnosticos/:id/resultados            ResultsPage (profile + deep analysis; first screen with navigation)
/panel                                  DashboardPage
/diagnosticos/:id/iniciativa            InitiativePage (correct a registered initiative)
*                                       NotFoundPage
```

Older routes (`/perfil`, `/recomendacion`, `/roadmap`, `/consentimiento`, `/cuestionario`, `/diagnosticos`) redirect.

## Forms and feedback

| Form                           | Tool                                   | Why                                                                                   |
| ------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------- |
| Consent (one checkbox)         | `useState`                             | A single boolean                                                                      |
| Initiative (ten fields)        | React Hook Form + `zodResolver`        | Validated with the contract's `registerInitiativeSchema`, the same one the API applies |
| **Questionnaire (48 answers)** | Zustand draft + contract validation    | 48 fields across components, persisted between reloads; the store drives progress    |

The outcome of an action (consent recorded, initiative saved, diagnostic processed, deep analysis ready, and their failures) is announced with a toast through `notify.success` / `notify.error` (`shared/ui/notify.ts`). Errors while loading a screen are shown inline with `Alert`.

## UI primitives

`shared/ui/` holds the primitives (Radix where accessibility matters, Tailwind classes organized with class-variance-authority) and the brand pieces listed in [`docs/MODULES.md`](./docs/MODULES.md#design-system-sharedui-sharedlib). Domain components (`LikertScale`, the radar, `StatementCard`) stay in their feature; a component moves to `shared/ui/` only when a second feature needs it.

- Tailwind utility classes are the styling language; merge classes with `cn()` (`shared/lib/utils.ts`), never string concatenation.
- Colors come from `shared/lib/palette.ts`, which `tailwind.config.ts` imports; surface, text and border tokens are HSL variables in `styles/globals.css`.
- Prettier with `prettier-plugin-tailwindcss` orders classes.

## Testing

```bash
pnpm --filter @innlab/web test          # vitest run: unit + component
pnpm --filter @innlab/web test:watch    # watch mode
pnpm --filter @innlab/web test:cov      # coverage
pnpm --filter @innlab/web test:e2e      # Playwright: builds, serves with vite preview, runs tests/e2e
```

The Playwright flow mocks the API with `page.route` and seeds a session in `localStorage`, so it needs neither the backend nor Core. Conventions: [`docs/conventions/TESTING-CONVENTIONS.md`](../../docs/conventions/TESTING-CONVENTIONS.md).

## Linting and formatting

- ESLint with `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y` and `eslint-plugin-boundaries` (features cannot import from each other).
- Prettier, configured at the repo root.
- The Husky hooks are inactive (`.npmrc` sets `ignore-scripts`): run `pnpm lint` and `pnpm typecheck` before committing.

## Environment variables

Vite exposes only variables prefixed `VITE_`; each one is documented in [`.env.example`](./.env.example). `.env.test` pins the values for Vitest; `.env.development` turns on the development autofill.

## Scripts

```bash
dev                    # vite dev server
build                  # tsc -p tsconfig.app.json --noEmit + vite build
preview                # serve dist/ locally
lint, lint:fix         # eslint
typecheck              # tsc -p tsconfig.app.json --noEmit
format                 # prettier --write
test, test:unit        # vitest run
test:watch, test:ui    # vitest watch / UI
test:cov               # coverage report
test:e2e               # playwright
```
