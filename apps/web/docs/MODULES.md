# Web Features

A walk-through of every feature folder in `apps/web/src/features/`. For each: its responsibility, the user stories it implements, its public surface (what `index.ts` exports), which Zustand stores or React Query keys it owns, which routes consume it, and its phase 1 status.

This is the frontend counterpart of [`apps/api/docs/modules.md`](../../api/docs/modules.md). Where the backend organizes by NestJS module = bounded context, the frontend organizes by **feature folder = bounded UI capability**.

The architectural rule that overrides everything else: **features cannot import from other features**. ESLint enforces this via `eslint-plugin-boundaries`. Cross-feature reuse goes through `shared/`; cross-tier contracts go through `@innlab/contracts`.

Phase 1 covers user stories from epics **E-03 (Cuestionario IRL)** and **E-04 (Diagnóstico inicial de madurez)**. Features supporting earlier epics (auth, consent, initiative) are walking skeletons. Later features (deep analysis, portfolio, report) are deferred.

| Feature                                 | Phase 1 status              | Owns                                                             |
| --------------------------------------- | --------------------------- | ---------------------------------------------------------------- |
| [`auth`](#auth)                         | Walking skeleton            | OIDC integration, protected route guard                          |
| [`diagnostic`](#diagnostic)             | Walking skeleton            | Diagnostic listing, state machine guard                          |
| [`consent`](#consent)                   | Walking skeleton            | Ley 1581 consent form                                            |
| [`initiative`](#initiative)             | Walking skeleton            | Initiative form (nombre, sector, descripción)                    |
| [`questionnaire`](#questionnaire)       | **Full — phase 1 priority** | 48-statement questionnaire UI, draft management, completeness UX |
| [`maturity-profile`](#maturity-profile) | **Full — phase 1 priority** | Radar chart, dimension cards, bottleneck and imbalance display   |

---

## `auth`

**Responsibility:** integrate with Keycloak via `react-oidc-context`. Provide the authentication context, the post-login callback, and the `ProtectedRoute` element used by the router. Expose the current user from a single hook.

**User stories:** HU-01 (RF-00, RF-01) — first authenticated session.

### Folder structure

```
features/auth/
├── components/
│   ├── AuthCallbackHandler.tsx     # /auth/callback — exchange code for tokens
│   └── ProtectedRoute.tsx          # route element wrapper
├── hooks/
│   ├── useCurrentUser.ts           # { id, name, email } or null
│   └── useSignOut.ts
├── api/
│   └── (none — react-oidc-context owns the network calls)
└── index.ts
```

### Public surface

```ts
export { ProtectedRoute } from './components/ProtectedRoute';
export { AuthCallbackHandler } from './components/AuthCallbackHandler';
export { useCurrentUser } from './hooks/useCurrentUser';
export { useSignOut } from './hooks/useSignOut';
```

### State

No Zustand store. `react-oidc-context` keeps tokens in its in-memory `UserManager`. The `useCurrentUser` hook is a thin selector over `useAuth()`.

### Routes consumed by

- `/auth/callback` → `AuthCallbackHandler`
- Every protected route is wrapped in `<ProtectedRoute>` at the router level (`app/router/routes.tsx`).

### Phase 1 status

Walking skeleton. Sign-in, sign-out, and protected-route enforcement work end-to-end. No role-based UI gating yet — every authenticated user is a "Líder de Iniciativa." Future: a `useHasRole('innlab-staff')` hook for admin UI.

---

## `diagnostic`

**Responsibility:** show the user their list of diagnostics, let them start a new one, and enforce the diagnostic state machine at the route level. The state-machine guard reads diagnostic state and either renders the page or redirects to the next required step.

**User stories:** HU-02, HU-03 (RF-02).

### Folder structure

```
features/diagnostic/
├── components/
│   ├── DiagnosticList.tsx          # rendered on HomePage
│   ├── DiagnosticListItem.tsx
│   ├── StartDiagnosticButton.tsx
│   └── DiagnosticGuard.tsx         # route element wrapper
├── hooks/
│   ├── useMyDiagnostics.ts         # list query
│   ├── useDiagnostic.ts            # single diagnostic query
│   └── useStartDiagnostic.ts       # mutation
├── api/
│   └── diagnostic.api.ts
└── index.ts
```

### Public surface

```ts
export { DiagnosticList } from './components/DiagnosticList';
export { StartDiagnosticButton } from './components/StartDiagnosticButton';
export { DiagnosticGuard } from './components/DiagnosticGuard';
export { useDiagnostic } from './hooks/useDiagnostic';
```

### State

Server state only — TanStack Query:

- `queryKeys.diagnostic.list()` — list of user's diagnostics. `staleTime: 30s`.
- `queryKeys.diagnostic.detail(id)` — single diagnostic. `staleTime: 1min`.

No Zustand store.

### Routes consumed by

- `/` and `/diagnosticos` (HomePage)
- `/diagnosticos/:id/*` — all child routes wrap in `<DiagnosticGuard>` which fetches the diagnostic and enforces the state machine (you can't reach `/cuestionario` before consent + iniciativa).

### Phase 1 status

Full. The state machine handles states up to `PERFIL_GENERADO`. Later states (deep analysis, portfolio routing) cause `DiagnosticGuard` to redirect to the most advanced reachable step.

---

## `consent`

**Responsibility:** present the Ley 1581 de 2012 consent UI and persist the user's acceptance via the API.

**User stories:** HU-04 (RF-03).

### Folder structure

```
features/consent/
├── components/
│   ├── ConsentForm.tsx             # rendered on ConsentPage
│   └── ConsentTermsModal.tsx       # full terms in a Radix dialog
├── hooks/
│   └── useRegisterConsent.ts       # RHF + Zod + mutation
├── schemas/
│   └── consent-form.schema.ts      # local Zod for the form
├── api/
│   └── consent.api.ts
└── index.ts
```

### Public surface

```ts
export { ConsentForm } from './components/ConsentForm';
```

### State

React Hook Form (one boolean field). No store. Mutation invalidates `queryKeys.diagnostic.detail(id)` on success so `DiagnosticGuard` advances to the next step.

### Routes consumed by

- `/diagnosticos/nuevo` (creates the diagnostic, then renders the form)
- `/diagnosticos/:id/consentimiento`

### Phase 1 status

Walking skeleton. Single terms version; no withdrawal-of-consent flow.

---

## `initiative`

**Responsibility:** capture initiative info (nombre, sector, descripción breve) before the questionnaire opens.

**User stories:** HU-05, HU-06 (RF-04).

### Folder structure

```
features/initiative/
├── components/
│   ├── InitiativeForm.tsx
│   └── SectorSelect.tsx            # uses the sectors catalog query
├── hooks/
│   ├── useSectorsCatalog.ts        # catalog query
│   └── useRegisterInitiative.ts    # mutation
├── schemas/
│   └── initiative-form.schema.ts   # local Zod for the form
├── api/
│   └── initiative.api.ts
└── index.ts
```

### Public surface

```ts
export { InitiativeForm } from './components/InitiativeForm';
```

### State

React Hook Form for the three-field form. TanStack Query for the sectors catalog with `staleTime: Infinity` (catalogs don't change at runtime). Mutation invalidates `queryKeys.diagnostic.detail(id)`.

### Routes consumed by

- `/diagnosticos/:id/iniciativa`

### Phase 1 status

Walking skeleton. Single sector taxonomy; no inline taxonomy management.

---

## `questionnaire`

**Responsibility:** render the 48-statement questionnaire, manage the answer draft, enforce completeness UX, and submit. This is the largest, most user-facing feature in phase 1.

**User stories:** HU-07, HU-08, HU-09, HU-10 (RF-05, RF-06).

**Phase 1 priority.**

### Folder structure

```
features/questionnaire/
├── components/
│   ├── QuestionnaireForm.tsx       # the orchestrating component
│   ├── DimensionTabs.tsx           # 6 tabs, one per dimension, with per-tab progress badge
│   ├── DimensionPanel.tsx          # renders the 8 statements of a dimension
│   ├── StatementCard.tsx           # one statement + LikertScale
│   ├── LikertScale.tsx             # built on Radix RadioGroup; 1..5
│   ├── ProgressIndicator.tsx       # "X de 48 respondidas"
│   ├── SubmitButton.tsx            # disabled until 48/48
│   └── IncompleteSubmitDialog.tsx  # dialog shown when API returns QUESTIONNAIRE_INCOMPLETE
├── hooks/
│   ├── useQuestionnaireStructure.ts  # catalog query for 6×8 statements
│   ├── useQuestionnaireDraft.ts      # Zustand store hook (re-export)
│   ├── useSubmitQuestionnaire.ts     # mutation
│   └── useResumeDraft.ts             # hydrates the store from server state if any
├── store/
│   └── questionnaire-draft.store.ts  # Zustand + persist(sessionStorage)
├── schemas/
│   └── (consumed from @innlab/contracts — no local schemas)
├── utils/
│   ├── group-by-dimension.ts
│   └── compute-progress.ts
├── api/
│   └── questionnaire.api.ts
└── index.ts
```

### Public surface

```ts
export { QuestionnaireForm } from './components/QuestionnaireForm';
export { useQuestionnaireDraft } from './hooks/useQuestionnaireDraft';
```

`QuestionnairePage` only renders `<QuestionnaireForm />`. Nothing else from this feature is needed outside.

### State

This is the **only feature in phase 1 that owns a Zustand store**.

- **Zustand store** (`questionnaire-draft.store.ts`) holds the 48 in-progress answers, the currently active dimension tab, and a `dirty` flag. Persisted to `sessionStorage` (not `localStorage`) — see [`state-management.md`](./state-management.md) for the rationale.
- **TanStack Query** holds the questionnaire structure (catalog, infinite stale time) and handles the submission mutation. On successful submission, the store is reset and the user navigates to `/diagnosticos/:id/perfil`.

The forbidden combination — using RHF for the 48-answer form — is documented in [`apps/web/CLAUDE.md`](../CLAUDE.md). RHF's value lookup fights with the cross-component progress UI; Zustand wins.

### Routes consumed by

- `/diagnosticos/:id/cuestionario`

### Components in detail

| Component                | What it does                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `QuestionnaireForm`      | Loads structure, hydrates store, renders `DimensionTabs` + `DimensionPanel` + `ProgressIndicator` + `SubmitButton`. Owns the submit handler |
| `DimensionTabs`          | Radix `Tabs.Root`. Each trigger shows the dimension code (TRL, CRL, …) and a count badge ("3/8"). Keyboard arrow navigation                 |
| `DimensionPanel`         | For the active dimension, renders 8 `StatementCard`s in `sequenceInDimension` order                                                         |
| `StatementCard`          | One statement + `LikertScale`. Reads/writes one entry in the store                                                                          |
| `LikertScale`            | Radix `RadioGroup` with five options. Arrow keys navigate; space toggles. `aria-label` from statement text                                  |
| `ProgressIndicator`      | Derived from store: total answered count, percentage. Re-renders cheaply via Zustand selector                                               |
| `SubmitButton`           | Disabled when `answeredCount < 48`. On submit, calls the mutation. On `QUESTIONNAIRE_INCOMPLETE` error, opens `IncompleteSubmitDialog`      |
| `IncompleteSubmitDialog` | Shows the `missing` array from the API response. Each item links back to the right dimension tab                                            |

### Phase 1 status

Full. Includes HU-09 (resume within the same session via `sessionStorage`). Cross-device draft persistence (saving to the server every N seconds) is deferred to phase 2 unless the team chooses to add it; see the questionnaire SaveDraftAnswersUseCase note in `apps/api/docs/modules.md`.

---

## `maturity-profile`

**Responsibility:** display the computed IRL maturity profile — radar chart, six dimension cards with IRL levels, bottleneck callout, imbalance alerts. Read-only.

**User stories:** HU-11, HU-12, HU-13, HU-14, HU-15 (RF-07, RF-08, RF-09, RF-10, RF-11).

**Phase 1 priority.**

### Folder structure

```
features/maturity-profile/
├── components/
│   ├── MaturityProfileView.tsx     # orchestrator on MaturityProfilePage
│   ├── RadarChart.tsx              # Recharts RadarChart — six axes
│   ├── DimensionResultCard.tsx     # one card per dimension with code, name, IRL level
│   ├── DimensionResultGrid.tsx     # six cards in a responsive grid
│   ├── BottleneckCallout.tsx       # highlights the bottleneck dimension(s), handles ties
│   ├── ImbalanceList.tsx           # lists imbalance pairs with classification
│   ├── ImbalanceItem.tsx           # one pair with icon + text + color
│   └── KthAttributionFooter.tsx    # CC BY-NC-SA 4.0 attribution (RNF-09)
├── hooks/
│   └── useMaturityProfile.ts       # query for the profile
├── utils/
│   ├── irl-level-color.ts          # maps 1..9 to a token color (single source of truth)
│   └── radar-data-shape.ts         # transforms API response → Recharts dataset
├── api/
│   └── maturity-profile.api.ts
└── index.ts
```

### Public surface

```ts
export { MaturityProfileView } from './components/MaturityProfileView';
export { useMaturityProfile } from './hooks/useMaturityProfile';
```

### State

Server state only — TanStack Query. `queryKeys.diagnostic.profile(id)` with `staleTime: 5min`. The profile doesn't change after it's computed (it's a snapshot), so a relatively long stale time is correct.

No Zustand store. No forms.

### Routes consumed by

- `/diagnosticos/:id/perfil`

### Components in detail

| Component              | What it does                                                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MaturityProfileView`  | Loads the profile, renders all sub-components. Handles loading and error states                                                                                                                           |
| `RadarChart`           | Recharts `RadarChart` with six axes (one per dimension) on a 1–9 domain. Single shape, single color from tokens. Includes accessible `<title>` and `<desc>` describing each axis value for screen readers |
| `DimensionResultGrid`  | Six `DimensionResultCard` in CSS grid, responsive (1 column mobile, 2 columns tablet, 3 columns desktop)                                                                                                  |
| `DimensionResultCard`  | Dimension code (TRL), Spanish name (Madurez Tecnológica), IRL level, the average likert, a small bar showing the level on a 1–9 scale                                                                     |
| `BottleneckCallout`    | Single bottleneck → "El cuello de botella es: TRL". Multiple tied → "Cuellos de botella (empate): TRL, CRL". RF-08                                                                                        |
| `ImbalanceList`        | Six pairs, each as an `ImbalanceItem`. Items are sorted: critical first, then moderate, then acceptable. Acceptable items collapse into a count by default                                                |
| `ImbalanceItem`        | Pair label ("TRL ↔ IPRL"), difference, classification. Color + icon + text — color never the only signal (a11y rule from `apps/web/CLAUDE.md`)                                                            |
| `KthAttributionFooter` | Footer text and link to the KTH IRL framework with CC BY-NC-SA 4.0 attribution. Always visible on this page per RNF-09                                                                                    |

### Phase 1 status

Full. PDF export of the profile (RF-16) is deferred — that's the `features/report` work in phase 2.

---

## Cross-feature rules (recap)

- **Features cannot import from other features.** ESLint blocks it. Move shared concepts to `shared/`.
- **Features own their API modules.** The shared `http` client from `@shared/api/http` is used by every feature's `api/` module.
- **Query keys come from `@shared/api/query-keys`.** Never hand-write a key inline.
- **Server state → React Query. Cross-component UI state → Zustand. Local UI state → `useState`.** Don't mix tools for the same piece of state.
- **Forms with ≤5 fields → React Hook Form. The 48-answer questionnaire → Zustand.** RHF is the wrong tool for cross-component derived UI at scale.
- **Components live in their owning feature until a second feature needs them.** Promotion to `shared/ui/` requires a real second consumer, not a hypothetical one.

If a change feels like it requires crossing a feature boundary, you're probably one refactor away from a `shared/` extraction. Stop, talk to the team.
