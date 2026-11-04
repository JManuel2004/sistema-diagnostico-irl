# State Management

Which tool owns which kind of state on the frontend, and why. Getting state placement wrong is the fastest way to a tangled SPA, and it is hard to undo once features depend on the wrong tool.

## The decision matrix

| Category of state                                           | Tool                                              | In this codebase                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Server state** — anything read from the API               | **TanStack Query**                                | Catalogs, the diagnostic and the user's list, profile, recommendation, roadmap      |
| **Browser drafts** — input that must survive a reload       | **Zustand** with `persist` (`sessionStorage` for the questionnaire, `localStorage` for the initiative) | The 48 answers and their optional justifications (also saved on the server, see below); the accepted consent version and the chosen initiative with its profile, as typed, until it is registered |
| **Form state**                                              | **React Hook Form** + `zodResolver`               | The initiative form (ten fields)                                                    |
| **Local component state**                                   | `useState` / `useReducer`                         | The consent checkbox, the radar highlight, open panels                              |
| **URL state**                                               | React Router params                               | The diagnostic id (`:id`) and the wizard step (`:step`)                             |
| **Session**                                                 | `shared/auth/session.ts` (`localStorage`)         | The INNLAB access token, read by the HTTP interceptor                               |

No Redux, MobX, Jotai or app-data React contexts. The only providers are `QueryClientProvider` and Sonner's `Toaster`.

## Why not mix

The same fact stored in two places diverges, and then nobody knows which is right. So:

- **Server state never goes into Zustand.** React Query already caches, deduplicates, retries and invalidates; a store that fetches reimplements all of it, badly.
- **Form values never go into Zustand** unless they are a draft that must survive a reload before it can be sent — the initiative profile is the one case: the wizard asks for it before the consent, and nothing about it may reach the server until the consent is recorded ([ADR 0007](../../../docs/architecture/decisions/0007-initiative-draft-before-consent.md), [ADR 0011](../../../docs/architecture/decisions/0011-initiative-identity-and-consent-per-initiative.md)). The form itself is still React Hook Form; the store only keeps the chosen initiative (`initiativeId`, `null` for a new one) and the form's values as typed, also half-filled, between steps.
- **The questionnaire is not a React Hook Form form.** Its surface is 48 cards, per-dimension tabs with progress, a global progress bar and a summary step; components subscribe to the slice they need (`useAnswerForStatement`), and the draft survives navigation and reloads through `persist`.
- **State shared by several siblings** moves up to the page (the radar highlight, `useRadarHighlight`) or, if it must survive navigation, into a store. It never goes into a context.

## TanStack Query

### Query keys

Every key comes from `shared/api/query-keys.ts`; never write one inline. Catalog keys are constants (`queryKeys.catalog.sectors`) or functions of the version (`queryKeys.catalog.questionnaire(version)`), per-diagnostic keys are functions of the id (`queryKeys.diagnostic.profile(id)`), and the user's initiatives are `queryKeys.initiative.mine`.

### Configuration per query

The client (`shared/api/query-client.ts`) never retries a 4xx, retries a 5xx or network error once, never retries a mutation and does not refetch on window focus. Each hook sets its own `staleTime` from `STALE_TIME`:

| Data                                              | `STALE_TIME`      | Value      |
| ------------------------------------------------- | ----------------- | ---------- |
| The diagnostic and the user's list                | `diagnostic`      | 30 seconds |
| Initiative profile, the user's initiatives         | `diagnosticInput` | 1 minute   |
| Saved results: profile, recommendation, roadmap   | `savedResult`     | 5 minutes  |
| Catalogs: sectors, stages, current consent text   | `catalog`         | 1 hour     |

The questionnaire catalog is `Infinity` (`staleTime` and `gcTime`) and keyed by framework version (`queryKeys.catalog.questionnaire(version)`): a published version never changes.

### Mutations and invalidation

A mutation that moves a diagnostic's state (initiative profile, finalize, deep analysis) calls `invalidateDiagnostic(queryClient, id)` (`shared/api/invalidate-diagnostic.ts`), which refetches the diagnostic and the user's list — both carry `completed` and `deepAnalysisAccepted`, which the screens decide on. It returns a promise, so the caller can wait before navigating. A mutation whose response is the new resource writes it with `setQueryData` instead of refetching it.

### Parsing at the boundary

Every API function parses the response with a `@innlab/contracts` schema, through `getParsed`, `getParsedOrNull` or `postParsed` (`shared/api/http.ts`). Backend contract drift fails where the data enters, not at render time.

## Zustand

Two stores, both drafts of user input, persisted in the browser:

| Store                        | Where                                                   | Holds                                                   |
| ---------------------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| `useQuestionnaireDraftStore` | `features/questionnaire/store/questionnaire-draft.store.ts` | Likert values, justifications and the active tab    |
| `useInitiativeDraftStore`    | `features/initiative/store/initiative-draft.store.ts`   | The accepted consent version, the chosen initiative and the profile as typed, until it is registered (`localStorage`) |

Rules that hold for both:

- **Scoped to one diagnostic.** `initialize(diagnosticId)` wipes the draft when it belongs to another diagnostic, so opening diagnostic B never shows A's answers.
- **`partialize` lists what is persisted**; derived values are not stored.
- **The questionnaire draft in `sessionStorage`:** it must survive a reload within the session, and what must outlive the session lives on the server.
- **The initiative draft in `localStorage`:** the profile is not on the server until it is registered, so it is kept on this browser across closing the tab, the browser or the session (not in another browser or a private window). Every change is kept, also of a half-filled form. Only the owner of the diagnostic can open its wizard, so another person signing in on the same browser does not see it; it is emptied when the profile is registered and discarded when another diagnostic is opened.
- **Lifetime:** each draft is cleared once what it holds is saved on the server (the initiative once registered, the questionnaire once processed), and dies with the tab. The questionnaire draft does not die with it: `useServerDraftSync` saves it on the server while the user answers (`unsynced`, `syncedAt` and `revision` in the store track what the server has) and reads it back in a later session; the server's copy replaces the tab's only when it is newer and the tab has nothing unsaved. The server copy is the persistence of the draft, not server state shown elsewhere, so the store stays its single source while the wizard is open.
- **The panel does not read the drafts.** Which diagnostic is in progress comes from the server (`GET /diagnostics/in-progress`), so «Continuar diagnóstico» appears on any device; starting a new one while it exists asks the user before discarding it.
- **Subscribe to a slice**, never to the whole store: `useQuestionnaireDraftStore((s) => s.answers[statementId])`.

Adding a third store needs a reason that fits none of the other rows of the matrix.

## React Hook Form

Used where a form has several fields validated together: today, `InitiativeForm`. The resolver is `zodResolver(initiativeFormSchema)`, built on the contract's `registerInitiativeSchema` — the one the backend applies — with only `teamSize` parsed from text, so the messages shown are the contract's. The form's values are text (`InitiativeFormValues`) and the resolver's output is the profile ready to send (`useForm<Values, unknown, InitiativeProfileFields>`: the command without `initiativeId`, which the page adds). A one-checkbox form (the consent) stays `useState`.

## Deciding where new state goes

1. Does it come from the API? → React Query.
2. Should a link reproduce it? → a route param.
3. Is it input that must survive a reload before it can be sent? → a Zustand draft.
4. Is it a form of several fields? → React Hook Form.
5. Otherwise → `useState` in the owning component, lifted to the page if siblings share it.
