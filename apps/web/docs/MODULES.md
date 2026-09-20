# Web Features

Deliberately short. Per `convenciones-objetivo.md` §4, what can be derived from the code is not documented by hand: the folder tree is `apps/web/src/features/`, and the routes are in the router. This file states the rule and maps each feature to the backend module it talks to.

This is the frontend counterpart of [`apps/api/docs/MODULES.md`](../../api/docs/MODULES.md). Where the backend organizes by NestJS module = bounded context, the frontend organizes by **feature folder = bounded UI capability**.

The rule that overrides everything else: **features cannot import from other features**. ESLint enforces it via `eslint-plugin-boundaries`. Cross-feature reuse goes through `shared/`; cross-tier contracts go through `@innlab/contracts`.

## Features that exist

| Feature | Talks to (backend) | Page |
| --- | --- | --- |
| `auth` | `shared/identity` — INNLAB SSO session, `me/context` | `AuthCallbackPage` |
| `questionnaire` | `diagnosis` — questionnaire structure, finalize | `QuestionnairePage` |
| `maturity-profile` | `diagnosis` — profile | `MaturityProfilePage` |
| `portfolio-recommendation` | `diagnosis` (accepts deep analysis) and `routing` (reads the recommendation and its trace) | `RecommendationPage` |
| `scaling-roadmap` | `roadmap` — reads the roadmap | `ScalingRoadmapPage` |

There are **no** `consent`, `initiative` or `diagnostic` features yet: the backend endpoints for consent and initiative exist (`initiative` module), but their forms are not built (`InProgressPage` stands in — `backlog-deuda-tecnica.md` 11.2).

## Where things live

- **Server state → React Query; UI/draft state → Zustand**, never both for the same piece of state — see [`STATE_MANAGEMENT.md`](./STATE_MANAGEMENT.md).
- Each feature owns its API module under `features/<name>/api/`; calls shared by several features live in `shared/api/` (for example `diagnostic.api.ts`).
- The recommendation is not triggered by the client: when the user presses «Aceptar análisis profundo», `RecommendationPage` accepts deep analysis (`POST diagnostics/:id/deep-analysis`) and the backend calculates through domain events. Nothing is sent by merely opening the page.
- **The frontend keeps no dimension names.** `name` and `shortName` come from the responses that name dimensions (profile, roadmap) and from the questionnaire catalog; only the visual metadata (colors, order) lives in `shared/lib/dimensions.ts`. The public landing page keeps its own editorial copy.
