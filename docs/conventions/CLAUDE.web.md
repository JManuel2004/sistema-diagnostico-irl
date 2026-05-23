# apps/web/CLAUDE.md

Frontend-specific rules. Read [the root `CLAUDE.md`](../../CLAUDE.md) first; this file adds frontend-only constraints.

## Stack assumptions

- React 19 with **function components only**. No class components except `ErrorBoundary` (where React requires it).
- Vite 5 with TypeScript. ESM throughout.
- React Router 7 (not 5, not "Remix data routers" — the standard `BrowserRouter` API).
- **Tailwind CSS + shadcn/ui** for styling. shadcn copies component source into `src/shared/ui/`; you own that code. Components compose Radix primitives + Tailwind classes organized with `class-variance-authority` (CVA). Use the `cn()` helper from `@/shared/lib/utils` (Tailwind classes merged via `tailwind-merge`) — never raw string concatenation for classNames.

## Folder rules

### Feature isolation (enforced by ESLint)

A feature folder lives at `src/features/<name>/`. The rule:

> **A feature cannot import from another feature.**

If two features need the same component or hook, the shared piece moves to `src/shared/`. If two features need the same domain concept, the contract goes through `@innlab/contracts`. There is no `features/_common/` or `features/shared/` escape hatch.

### Allowed import paths

| From               | May import from                                                                       |
| ------------------ | ------------------------------------------------------------------------------------- |
| `app/`             | `app/`, `pages/`, `features/*`, `shared/`, `@innlab/contracts`                        |
| `pages/`           | `features/*`, `shared/`, `@innlab/contracts` (not `app/`, not other pages)            |
| `features/<name>/` | itself, `shared/`, `@innlab/contracts` (not other features, not `pages/`, not `app/`) |
| `shared/`          | `shared/` only (no features, no pages, no app)                                        |

### Feature folder skeleton

```
features/<name>/
├── api/              # API client functions; return typed promises
├── components/       # feature-private React components
├── hooks/            # feature-private custom hooks
├── store/            # zustand store (only if state crosses ≥3 components)
├── schemas/          # zod schemas (re-export from @innlab/contracts when shared)
├── utils/            # pure helpers
└── index.ts          # public surface — barrel
```

Only export from `index.ts` what's needed outside the feature. Everything else is private.

## State management decisions

| State                                                      | Tool                                                              | Rationale                                                       |
| ---------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| Anything fetched from the API                              | **TanStack Query**                                                | Caching, refetching, retry policy, dedup                        |
| Questionnaire draft (48 answers + active tab + dirty flag) | **Zustand** with `persist` middleware writing to `sessionStorage` | Cross-component access; survive route navigation within session |
| Form state for short forms (consent, initiative)           | **React Hook Form**                                               | Standard form ergonomics                                        |
| Local UI state (a modal open flag, an input focus state)   | `useState`                                                        | Don't over-tool simple state                                    |

**Forbidden combinations:**

- Server state in Zustand. Use React Query.
- Form values in Zustand for a 2-3 field form. Use React Hook Form.
- React Hook Form for the 48-answer questionnaire. The cross-component progress UI makes RHF awkward; Zustand wins.

Full guidance: [`docs/state-management.md`](./docs/state-management.md).

## Component conventions

### Function components, named exports

```tsx
// ✓ correct
export function StatementCard({ statement, value, onChange }: Props): JSX.Element {
  return <article>{/* ... */}</article>;
}

// ✗ wrong — default export outside route components
export default function StatementCard() { /* ... */ }

// ✗ wrong — arrow function components without explicit return type
export const StatementCard = ({ statement }) => <article>{statement}</article>;
```

The one exception: page components rendered as route elements use **default exports** because React Router idioms expect them and `React.lazy()` requires them for code splitting.

### Props typed at the component

```tsx
type StatementCardProps = {
  statement: Statement;
  value: LikertValue | null;
  onChange: (value: LikertValue) => void;
};

export function StatementCard({ statement, value, onChange }: StatementCardProps): JSX.Element {
  // ...
}
```

Don't use `React.FC`. It infers `children` even when you don't want it.

## API layer

A feature's API functions live in `features/<name>/api/`. Functions:

- Accept a typed command (often imported from `@innlab/contracts`).
- Call the shared `http` client from `@shared/api/http`.
- Parse the response with a Zod schema from `@innlab/contracts` (or local if not shared).
- Throw on failure; React Query's `useMutation`/`useQuery` handles error propagation.

```ts
// features/questionnaire/api/questionnaire.api.ts
import { http } from '@shared/api/http';
import {
  type SubmitQuestionnaireCommand,
  maturityProfileResponseSchema,
  type MaturityProfileResponse,
} from '@innlab/contracts';

export async function submitQuestionnaire(
  cmd: SubmitQuestionnaireCommand,
): Promise<MaturityProfileResponse> {
  const { data } = await http.post(
    `/diagnosticos/${cmd.diagnosticId}/cuestionario/envio`,
    { answers: cmd.answers },
  );
  return maturityProfileResponseSchema.parse(data);
}
```

Never inline `fetch` or `axios` calls inside components. Always go through a feature's API module.

## Query keys

All React Query keys come from the centralized `queryKeys` object in `@shared/api/query-keys`. Never hand-write a key inline.

```ts
// ✓ correct
useQuery({ queryKey: queryKeys.diagnostic.profile(id), queryFn: () => getProfile(id) });

// ✗ wrong
useQuery({ queryKey: ['profile', id], queryFn: () => getProfile(id) });
```

## Forms

For 1–5 field forms, use React Hook Form + Zod:

```tsx
const form = useForm<InitiativeFormValues>({
  resolver: zodResolver(initiativeFormSchema),
  defaultValues: { nombre: '', sector: '', descripcion: '' },
});
```

For the questionnaire, **do not use RHF**. Use the Zustand store. RHF's value lookup model fights with cross-component derived UI (progress per dimension, dimension tab badges).

## Accessibility

ESLint enforces a11y via `jsx-a11y`. Don't disable rules to "make it work" — fix the markup.

Specific requirements:

- The `LikertScale` is built on Radix's `RadioGroup` so keyboard navigation and ARIA roles are correct by construction.
- Every form input has an associated `<label>` linked by `htmlFor`/`id` or wrapped.
- Every interactive element is keyboard reachable. No `<div onClick>`; use `<button>`.
- Color is never the only signal. Imbalance alerts use icon + text + color, never color alone.
- Focus outlines are visible. Don't `outline: none` without providing an alternative.

## Routing rules

- Use `<Link>` and `useNavigate()`. Never `<a href>` for internal navigation.
- Protected routes wrap in `<ProtectedRoute>`.
- Routes that depend on diagnostic state wrap in `<DiagnosticGuard>` — the guard fetches the diagnostic and ensures the user has reached the required step.
- Route params: `:id` for diagnostic IDs, validated as UUID in the guard.

## Hard prohibitions specific to frontend

In addition to the root list:

- **No `any`.** Use `unknown` and narrow.
- **No `as` for unsafe casts.** If you need to cast, the type model is wrong. Fix the type model.
- **No inline styles** except dynamic positioning where CSS variables aren't viable.
- **No `dangerouslySetInnerHTML`.** Catalog content is structured; render it as React.
- **No localStorage for secrets or sensitive data.** Use `sessionStorage` for the questionnaire draft; tokens stay in `react-oidc-context`'s in-memory user manager.
- **No bypassing the proxy in dev.** Don't hardcode `http://localhost:3000` — use `/api/v1/...` and let Vite proxy handle it.
- **No untyped fetch calls.** Always go through the feature API module that parses with Zod.
- **No third-party UI component kits beyond shadcn/ui + Radix.** We're committed to the shadcn copy-into-repo model. No Material UI, no Chakra, no Ant Design. If a primitive you need isn't in shadcn, build it on Radix following the shadcn pattern (Radix primitive + Tailwind classes + CVA variants).

## Testing pattern reminders

- Component tests use **Testing Library** queries (`getByRole`, `getByLabelText`). Avoid `getByTestId` unless nothing else works.
- Mock API calls with **MSW**, not by mocking `axios`. MSW intercepts at the network layer, so tests run the real HTTP code.
- E2E tests stub the OIDC flow at the Playwright fixture level — we don't run a real Keycloak in E2E.
- One Playwright spec per user story (HU-xx).

Recipes: [`docs/conventions/testing.md`](../../docs/conventions/testing.md).