# Web Features

Deliberately short. Per `convenciones-objetivo.md` §4, what can be derived from the code is not documented by hand: the folder tree is `apps/web/src/features/`, and the routes are in the router. This file states the rule and maps each feature to the backend module it talks to.

This is the frontend counterpart of [`apps/api/docs/MODULES.md`](../../api/docs/MODULES.md). Where the backend organizes by NestJS module = bounded context, the frontend organizes by **feature folder = bounded UI capability**.

The rule that overrides everything else: **features cannot import from other features**. ESLint enforces it via `eslint-plugin-boundaries`. Cross-feature reuse goes through `shared/`; cross-tier contracts go through `@innlab/contracts`.

## Features that exist

| Feature | Talks to (backend) | Page |
| --- | --- | --- |
| `auth` | `shared/identity` — INNLAB SSO session, `me/context` | `AuthCallbackPage` |
| `questionnaire` | `diagnosis` — questionnaire structure; the draft of the 48 answers and their justifications (Zustand); the summary table | `DiagnosticWizardPage` (steps 3 and 4) |
| `consent` | `initiative` — reads and records the privacy consent (Law 1581) and holds its text | `DiagnosticWizardPage` (step 2) |
| `initiative` | `initiative` — profile registration and reading, sector and stage catalogs; the browser draft of the form | `DiagnosticWizardPage` (step 1), `InitiativePage`, `DashboardPage` |
| `maturity-profile` | `diagnosis` — profile | `ResultsPage` |
| `portfolio-recommendation` | `diagnosis` (accepts deep analysis) and `routing` (reads the recommendation and its trace) | `ResultsPage` |
| `scaling-roadmap` | `roadmap` — reads the saved roadmap | `ResultsPage` |

There is no `diagnostic` feature: starting, reading and processing a diagnostic go through `shared/api/diagnostic.api.ts` and `shared/hooks/`, because several pages and features need them.

## Pages and flow

`/` (landing, public, no navigation, one button) → **Iniciar diagnóstico** → `/diagnosticos/nuevo` (protected: without a session it goes through the INNLAB sign-in and continues here on return; with one it just proceeds) → asks the backend for the user's diagnostic, which **resumes the unfinished one** or creates one → the wizard `/diagnosticos/:id/asistente/:paso` (no navigation) → `/diagnosticos/:id/resultados` (the first screen with navigation) → `/panel`.

The wizard has four steps, in this order: `iniciativa` (initiative profile), `consentimiento` (privacy consent), `cuestionario` (48 statements, each with its justification) and `resumen` (a table per dimension, in tabs, with **Statement / Score / Justification**; «Procesar diagnóstico» sends the answers and computes the profile). Which step applies is decided by what the server already has (initiative registered, consent recorded), not by a local flag: resuming lands on the first missing step and a later step cannot be opened by URL. A diagnostic that already has results is not resumed: its results open.

- **Nothing about the initiative is stored before the consent** (RF-03, RNF-06). The form is asked first but, until the consent is accepted, it is a browser draft (`useInitiativeDraftStore`, `sessionStorage`); accepting sends the consent and then the initiative. The backend also refuses the initiative without a consent (409).
- The old `/perfil`, `/recomendacion` and `/roadmap` routes redirect to `/resultados`; `/cuestionario` and `/consentimiento` redirect to their wizard step; `/diagnosticos` redirects to `/`.
- `/panel` shows the initiative of the latest diagnostic **with results**, offers to continue one still in the wizard, and reserves the space for the history of past diagnostics (a future story). `/diagnosticos/:id/iniciativa` is only for correcting an already registered initiative; the first registration is wizard step 1.

## Where things live

- **Server state → React Query; UI/draft state → Zustand**, never both for the same piece of state — see [`STATE_MANAGEMENT.md`](./STATE_MANAGEMENT.md).
- Each feature owns its API module under `features/<name>/api/`; calls shared by several features live in `shared/api/` (for example `diagnostic.api.ts`).
- **One results page.** `ResultsPage` shows the maturity profile and, only when the backend says the deep analysis was accepted (`deepAnalysisAccepted` on `GET diagnostics/:id`), also the imbalanced pairs, the critical-state alerts, the roadmap and the recommendation. The accept button (`AcceptDeepAnalysisCard`) lives in that page; nothing is sent by merely opening it. The recommendation and the roadmap are not even requested before acceptance.
- Pages compose features: `ResultsPage` uses three (`maturity-profile`, `scaling-roadmap`, `portfolio-recommendation`); a feature may not import another, a page may.
- **The radar, its legend and the summary cards share one highlight** (`useRadarHighlight`, local state of the page, no global store): hovering or focusing a card, a legend item or a pair highlights its dimensions in the radar; a click on a legend item pins it.
- **Starting a diagnostic** is `POST diagnostics` (`useStartDiagnostic`), idempotent per user while one is unfinished; `StartDiagnosticPage` and the panel use it and open the wizard, which decides the step. `completed` on the diagnostic (derived by the backend) tells a diagnostic with results from one still in the wizard.
- **The questionnaire does not scroll on mount.** `DimensionTabs` scrolls to the top of its panel only when the dimension changes (compared with the last shown), so the page loads from the top, also under StrictMode; every wizard step opens from the top of the page.
- **Development autofill.** `src/dev/` holds the AgroConecta case (initiative profile and the 48 answers with their justifications) and two buttons. They exist only when `VITE_DEV_AUTOFILL` is `true` **at build time**, which only `.env.development` sets; a production build does not contain the data or the buttons (`src/dev/__tests__/production-bundle.test.ts` builds and checks). The backend e2e suites use the same 48 scores (`apps/api/test/e2e/support/agroconecta-case.ts`).
- **Typecheck.** `pnpm typecheck` and `pnpm build` run `tsc -p tsconfig.app.json`; the bare `tsc --noEmit` at the root checked nothing because that tsconfig only has references.
- **The frontend keeps no dimension names.** `name` and `shortName` come from the responses that name dimensions (profile, roadmap) and from the questionnaire catalog; only the visual metadata (colors, order) lives in `shared/lib/dimensions.ts`. The public landing page keeps its own editorial copy.

## Results page: how it reads

- **The page opens with the initiative** (`ProfileHero`): its name as the page title, a short description (the product type) and its sector and stage as badges, and next to it the global IRL level (RF-09, the simple average of the six levels, computed by the backend as `globalAverage`) with the strongest and the weakest dimension. The sections then address the initiative by name.
- **No radar legend.** Each point of the radar has the color of its dimension and, on hover or keyboard focus, a tooltip that says what the dimension measures (the description comes from the questionnaire catalog) and its level. The emphasis (a hovered point or card fades the rest) is CSS driven by a `data-highlighted` attribute on the radar wrapper (`globals.css`, «Radar emphasis»), and the chart itself is memoized: re-rendering recharts on every hover restarts its animation and remounts the points, which closes the tooltip under the cursor.
- **The deep analysis is written for someone who knows neither the system nor the IRL framework:** dimension names instead of codes, sentences instead of arrows or symbols, no internal identifiers (the trace and the roadmap explanation say what an adjustment did and why the center declared it, never its code), and no reading text below `text-sm`. Imbalances are ordered by severity; pairs, alerts, roadmap and service are white cards with hairlines, and only the critical pair and the recommended service carry a coloured top line. Critical dimensions get their own card with the next step from the roadmap. Once the deep analysis is accepted, a sticky section bar reaches its four blocks.
- **The routing trace answers before it explains** (`LayerTracePanel`): one sentence says which service came first and why, then three steps — what does not apply, the order, the center's adjustment. Only the winner shows its reasons, as labels; the rest fold away. A label that groups several dimensions always says which ones: «3 brechas» names them in its tooltip and repeats them in a `sr-only` text, so the count is checkable without a pointer.
- **The invitation to the deep analysis** (`AcceptDeepAnalysisCard`) is a proposal with two paths, ask for it or continue later from the panel; it sends nothing until the user asks.

## Design system (`shared/ui`, `shared/lib`)

Brand and visual rules are in `DESIGN.md` at the project root. Two of them decide most of what follows, both measured on <https://innlab.org>: **colour is a budget** (its interior pages keep 90% of the area white or light grey and spend accent colour on 1–5%), so here colour rides on the data (bars, radar, dimension icons), on one brand mosaic per screen, on the primary button and on the footer; and **corners are straight** everywhere except circles. What the code offers so no screen writes its own:

| Piece | Use |
| --- | --- |
| `shared/lib/palette.ts` | **Single source of the brand, semantic and dimension colors.** `tailwind.config.ts` imports it to build the utilities and SVG code (the radar) reads the same constants. Surface, text and border tokens are HSL variables in `styles/globals.css` (`hsl(var(--border))` in SVG). Never write `var(--color-…)`: no stylesheet defines it. |
| `Card` | Content box: straight corners, hairline border, no shadow. |
| `Alert` | State message (error, notice, info, confirmation) with icon and ARIA role; `critical` is `role="alert"`. Not a `Card`. |
| `LoadingState` | The one loading treatment. The questionnaire skeleton stays apart because it reproduces the shape of the 48 cards. |
| `PageHeader` | Overline, `text-h1` title, description, and optional metadata below. |
| `ResultMeta` | «Resultado guardado el …», under the title of profile, recommendation and roadmap. |
| `DisclosurePanel` | Collapsible «how we got here» panel (recommendation trace, roadmap explanation). |
| `AcceptDeepAnalysisCard` | The invitation to accept deep analysis, on the results page and for retrying a calculation that failed. |
| `SectionHeader` | Title of a section inside a page (`h2`), with its description, its result metadata and, optionally, an icon inside a blue circle. |
| `Tooltip`, `GlossaryTerm` | One-sentence explanations of the technical terms (`shared/lib/glossary.ts`), reachable by hover and by keyboard. Radix, like `Dialog`. |
| `Field`, `Input`, `Textarea`, `Select` | Form controls with label, hint and error wired with `aria-describedby`, from the `DESIGN.md` form input: 48px high, 16px text so mobile browsers do not zoom in, and `Select` is still a native `<select>` with its own chevron. `Textarea` grows with its content: a long answer is read whole, with no scrollbar inside the field. |
| `AppNav` | Navigation after the institutional descriptor: panel and results of the active diagnostic (the one in the URL, else the latest with results). Only on the screens after the wizard (results, panel, correcting the initiative); opt-in per page (`PageShell showNavigation`). |
| `BrandDescriptor` | The institutional descriptor; it links to `/panel` where the page has navigation and to `/` (the landing) where it does not (landing, wizard). |
| `Badge`, `LevelBar`, `DimensionChip` | Small pieces that make a result readable at a glance: a labelled category or severity (`Badge`, an uppercase 14px label over a soft wash of its tone), the 1 to 9 scale as nine segments with an optional goal and gap threshold (`LevelBar`), and a dimension with its icon and color (`DimensionChip`). The icon, `bg`, `chip`, `tint`, `border` and `fill` of each dimension come from `getDimensionVisual` (`shared/lib/dimensions.ts`); `tint` is neutral, so a dimension is told by its icon, its text and its bars. |
| `WizardStepper` | The steps of the wizard and the current one (number or check, `aria-current="step"`); earlier steps are links, later ones are not. Under `sm` the list becomes «Paso N de M» with a segment bar: four steps do not fit in a 390px row. |
| `PageShell` | The chrome of every page: institutional descriptor, navigation (opt-in) and the blue footer with the Icesi | INNLAB lockup and the KTH attribution. Under `md` the navigation drops to its own tab row and the side gutter is 16px. |
