# State Management

How state is organized on the frontend, which tool owns which category of state, and why. This is the most important architectural document for the SPA — getting state placement wrong is the fastest way to grow a tangled codebase, and it's hard to undo once features depend on the wrong tool.

The rules here are not opinions. They were chosen because each tool handles a specific kind of state better than the alternatives, and mixing them for the same piece of state causes bugs.

## TL;DR — the decision matrix

| Category of state                                                                        | Tool                                                              | Examples                                                                  |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Server state** — anything fetched from the API                                         | **TanStack Query**                                                | Catalogs, diagnostic detail, maturity profile, list of user's diagnostics |
| **Questionnaire draft** — the 48 in-progress answers + active dimension tab + dirty flag | **Zustand** with `persist` middleware writing to `sessionStorage` | Cross-component, must survive route nav within the session                |
| **Form state for short forms** (≤5 fields)                                               | **React Hook Form** + Zod                                         | Consent (1 checkbox), initiative (3 fields)                               |
| **Local component state**                                                                | `useState` / `useReducer`                                         | Modal open/closed, input focus, hover state                               |
| **URL-derived state**                                                                    | React Router params + `useSearchParams`                           | Active diagnostic ID, current tab via `?dimension=TRL`                    |

Every other tool reaches for one of these. No Redux. No MobX. No Jotai. No Recoil.

## Why these tools, and why not mix

Each tool exists in this project because it does one thing well:

- **TanStack Query** does cache invalidation, refetching on focus, stale-while-revalidate, retry policy, request deduplication, and optimistic updates. None of those are state-management features in the traditional sense — they're network-state features. Building them yourself is how teams spend three sprints reinventing TanStack Query.
- **Zustand** is the simplest store API that supports selective subscriptions (`useStore(state => state.x)` doesn't re-render when `state.y` changes). For state that crosses many components and survives navigation, this is what you want.
- **React Hook Form** keeps form values out of React state, so re-renders don't propagate per keystroke. Adding RHF for a 1-checkbox form is overkill; for a multi-field form it's essential.
- **`useState`** is the cheapest tool. When a piece of state belongs to one component and no one else cares about it, this is correct.

The reason for the rules below is the same reason you don't store the same fact in two database tables: when the two diverge, you have a bug, and you won't know which is right.

## Forbidden combinations

These are not "discouraged." They are **forbidden** in code review:

### Server state in Zustand

```ts
// ✗ wrong — putting fetched data in a store
const useMyDiagnosticsStore = create((set) => ({
  diagnostics: [],
  fetch: async () => {
    const data = await getMyDiagnostics();
    set({ diagnostics: data });
  },
}));
```

Why it's wrong: now you've reimplemented caching, refetching, retry, and invalidation — all badly. React Query does this in one hook.

```ts
// ✓ correct
export function useMyDiagnostics() {
  return useQuery({
    queryKey: queryKeys.diagnostic.list(),
    queryFn: getMyDiagnostics,
  });
}
```

### Form values in Zustand for short forms

```ts
// ✗ wrong — initiative form (3 fields) in a Zustand store
const useInitiativeFormStore = create((set) => ({
  nombre: '',
  sectorId: '',
  descripcion: '',
  setNombre: (v) => set({ nombre: v }),
  // ...
}));
```

Why it's wrong: every keystroke triggers a store update; every component subscribed re-renders; you've lost RHF's uncontrolled-input optimization for no gain. The store outlives the form, which is usually a bug (you want a fresh form on remount).

```ts
// ✓ correct
const form = useForm<InitiativeFormValues>({
  resolver: zodResolver(initiativeFormSchema),
  defaultValues: { nombre: '', sectorId: '', descripcion: '' },
});
```

### RHF for the 48-answer questionnaire

The questionnaire is the exception that proves the rule. RHF works beautifully for short forms because the form is _the_ surface. The questionnaire surface is the form + per-dimension progress badges + a global progress indicator + a submit button that knows whether all 48 are answered + an incomplete-submit dialog that navigates back to gaps. RHF's value lookup (`form.getValues('answers.42')`) doesn't compose with cross-component derived UI without a lot of `watch()` calls and parent re-renders.

Zustand wins because:

- Components subscribe to the slice they care about (`useQuestionnaireDraft(s => s.progressByDimension.TRL)` only re-renders that one tab badge).
- The draft survives navigation away from `/cuestionario` and back, automatically, via `persist`.
- The store can be reset on submission without remount tricks.

### `useState` for state shared across siblings

```tsx
// ✗ wrong — three siblings share an "active tab"
function QuestionnaireForm() {
  const [activeTab, setActiveTab] = useState('TRL');
  return (
    <>
      <DimensionTabs activeTab={activeTab} onChange={setActiveTab} />
      <DimensionPanel activeTab={activeTab} />
      <ProgressIndicator activeTab={activeTab} />
    </>
  );
}
```

This isn't wrong on day one. It becomes wrong when a fourth and fifth consumer appear, and the prop drilling grows. If a piece of state has three consumers that are siblings or near-siblings, it's a Zustand candidate. The questionnaire's `activeTab` lives in the store for exactly this reason.

## TanStack Query — conventions

### Query keys

Every key comes from `@shared/api/query-keys`. **Never** hand-write a key inline.

```ts
// shared/api/query-keys.ts
export const queryKeys = {
  catalog: {
    questionnaireStructure: () => ['catalog', 'questionnaire-structure'] as const,
    sectors: () => ['catalog', 'sectors'] as const,
  },
  diagnostic: {
    all: () => ['diagnostic'] as const,
    list: () => ['diagnostic', 'list'] as const,
    detail: (id: string) => ['diagnostic', 'detail', id] as const,
    profile: (id: string) => ['diagnostic', id, 'profile'] as const,
  },
} as const;
```

Reasons:

- Refactor safety. Renaming a key in one place updates every caller.
- Predictable invalidation. `queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.all() })` clears everything diagnostic-related.
- Cache inspection in React Query Devtools is readable.

### Configuration per query

| Data shape                                                        | `staleTime` | `gcTime`   | Retry |
| ----------------------------------------------------------------- | ----------- | ---------- | ----- |
| Catalog data (questionnaire structure, sectors, conversion table) | `Infinity`  | `Infinity` | 1     |
| Maturity profile (snapshot, never changes after computed)         | 5 minutes   | 30 minutes | 1     |
| Diagnostic detail (state changes during the flow)                 | 30 seconds  | 5 minutes  | 1     |
| Diagnostic list                                                   | 30 seconds  | 5 minutes  | 1     |

**`staleTime: Infinity` for catalogs** is intentional. Per SA-06, catalog content (statements, conversion table, sectors) is immutable at runtime — the only way it changes is a deploy with new seeds, which restarts the app. So we never need to refetch them mid-session.

### Retry policy

Don't retry on 4xx. A 400 from a malformed request won't become a 200 the third time.

```ts
// shared/api/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isHttpError(error) && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

`refetchOnWindowFocus: false` is project-specific: most of our queries are catalogs or snapshots; aggressive refetching on focus is noise here.

### Mutations and invalidation

When a mutation changes server state, invalidate the queries it touches.

```ts
// features/consent/hooks/useRegisterConsent.ts
export function useRegisterConsent(diagnosticId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registerConsent,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.diagnostic.detail(diagnosticId),
      });
    },
  });
}
```

For the questionnaire submission, two invalidations:

```ts
onSuccess: (profile) => {
  queryClient.setQueryData(queryKeys.diagnostic.profile(diagnosticId), profile);
  queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.detail(diagnosticId) });
};
```

We `setQueryData` for the profile because the API returns it directly (no need to refetch); we invalidate the diagnostic detail because its state transitioned to `PERFIL_GENERADO`.

### Schema parsing at the boundary

Every query function parses the response with a Zod schema from `@innlab/contracts`. This is non-negotiable; it's how the frontend catches backend contract drift in development instead of crashing on a missing field at render time.

```ts
// features/maturity-profile/api/maturity-profile.api.ts
export async function getProfile(id: string): Promise<MaturityProfileResponse> {
  const { data } = await http.get(`/diagnosticos/${id}/perfil`);
  return maturityProfileResponseSchema.parse(data); // throws if shape drifts
}
```

## Zustand — conventions

### One store per feature, at most one for phase 1

Phase 1 ships **one** Zustand store: the questionnaire draft. Adding a second store should require team discussion. Most cases that feel like "I need a store" are actually "I need to lift state up two components" or "this belongs in React Query."

### Store shape — the questionnaire draft

```ts
// features/questionnaire/store/questionnaire-draft.store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { DimensionCode, LikertValue } from '@innlab/contracts';

type AnswerMap = Record<string, LikertValue>; // statementId -> value

type State = {
  diagnosticId: string | null;
  answers: AnswerMap;
  activeTab: DimensionCode;
  dirty: boolean;
};

type Actions = {
  initialize: (diagnosticId: string) => void;
  setAnswer: (statementId: string, value: LikertValue) => void;
  setActiveTab: (tab: DimensionCode) => void;
  reset: () => void;
};

const initialState: State = {
  diagnosticId: null,
  answers: {},
  activeTab: 'TRL',
  dirty: false,
};

export const useQuestionnaireDraft = create<State & Actions>()(
  persist(
    (set) => ({
      ...initialState,
      initialize: (diagnosticId) =>
        set((s) => (s.diagnosticId === diagnosticId ? s : { ...initialState, diagnosticId })),
      setAnswer: (statementId, value) =>
        set((s) => ({
          answers: { ...s.answers, [statementId]: value },
          dirty: true,
        })),
      setActiveTab: (activeTab) => set({ activeTab }),
      reset: () => set(initialState),
    }),
    {
      name: 'questionnaire-draft',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        diagnosticId: s.diagnosticId,
        answers: s.answers,
        activeTab: s.activeTab,
      }),
    },
  ),
);
```

Notes:

- **Actions and state in the same store.** Zustand's idiomatic shape.
- **`initialize(diagnosticId)`** is a guard: if a user starts diagnostic A, fills 20 answers, then opens diagnostic B in the same tab, we wipe the store. Otherwise we'd contaminate B with A's drafts.
- **`partialize`** explicitly lists what gets persisted. `dirty` is derived, not stored.
- **`createJSONStorage(() => sessionStorage)`** — see the next section.

### `sessionStorage` vs `localStorage`

We use **`sessionStorage`**, not `localStorage`. Reasons:

- **HU-09** requires that a user can resume their in-progress questionnaire _within the same session_. Across-session resume is a phase 2 feature handled server-side, not client-side.
- A multi-user shared computer (a possibility in INNLAB's coworking spaces) shouldn't leak one user's draft answers into the next user's session.
- `sessionStorage` is automatically cleared when the tab closes, which matches our scope.
- If the user wants long-lived persistence, that's a server-side draft (an explicit `SaveDraft` API call), not a client store.

### Selectors

Always subscribe to a selector slice, never the whole store.

```tsx
// ✓ re-renders only when answers change
const answers = useQuestionnaireDraft((s) => s.answers);

// ✓ re-renders only when this one answer changes
const value = useQuestionnaireDraft((s) => s.answers[statementId]);

// ✗ re-renders on every store update
const everything = useQuestionnaireDraft();
```

For derived values that depend on multiple slices, compute them in the component or in a `useMemo`. Don't use `shallow` equality just to subscribe to "everything" — it defeats the purpose.

## React Hook Form — conventions

For forms with ≤5 fields, RHF + `@hookform/resolvers/zod` is the default.

```tsx
// features/initiative/components/InitiativeForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { initiativeFormSchema, type InitiativeFormValues } from '../schemas/initiative-form.schema';

export function InitiativeForm({ diagnosticId }: Props): JSX.Element {
  const form = useForm<InitiativeFormValues>({
    resolver: zodResolver(initiativeFormSchema),
    defaultValues: { nombre: '', sectorId: '', descripcion: '' },
  });

  const { mutate, isPending } = useRegisterInitiative(diagnosticId);

  const onSubmit = form.handleSubmit((values) => {
    mutate(values);
  });

  return (
    <form onSubmit={onSubmit}>
      <TextField
        label="Nombre"
        {...form.register('nombre')}
        error={form.formState.errors.nombre?.message}
      />
      {/* ... */}
      <Button type="submit" disabled={isPending}>
        Continuar
      </Button>
    </form>
  );
}
```

The Zod schema is the source of truth for both shape and validation messages. When the schema is shared with the backend, import it from `@innlab/contracts`; when it's purely a UI concern (a "confirm password" field, a "I'm not a robot" checkbox), keep it local.

## `useState` — when it's right

Most state in this codebase is `useState`. The bar is low: if the state lives and dies with the component, `useState` is correct.

```tsx
function ConsentTermsModal() {
  const [isOpen, setIsOpen] = useState(false);
  // ...
}
```

Don't apologize for `useState`. The mistake to avoid is the opposite: reaching for Zustand or React Query for state that fits in `useState`.

## URL-derived state

The URL is a state container. Use it.

- **Diagnostic ID** — `:id` route param. Don't store it in Zustand; the URL is the source of truth.
- **Active dimension tab** in the questionnaire — although currently stored in Zustand for the cross-component badge logic, a future improvement could surface it as `?dimension=TRL` so the URL deep-links to a specific tab. Either approach is defensible; the current choice (Zustand) keeps the URL clean during in-progress work.

Whenever a piece of state would be useful in a shareable URL, surface it as a query param.

## Decision flowchart for new state

When adding new state, ask in order:

1. **Does it come from the API?** → React Query.
2. **Does it belong in the URL** (you'd want to share it via link or deep-link to it)? → React Router param or `useSearchParams`.
3. **Is it a short form's values?** → React Hook Form.
4. **Does it cross multiple components AND survive navigation within the session?** → Zustand.
5. **Otherwise** → `useState` in the owning component.

If you can't answer "yes" to any of 1–4, the answer is 5. Resist the urge to start with a store.

## What about React context?

For provider-style cross-cutting state (theme, locale, auth context), React Context is fine. We use it for:

- `react-oidc-context` (auth) — provided by the library.
- The React Query `QueryClientProvider` — required.
- The Radix `ToastProvider` — required by the toast component.

We don't roll our own contexts for app data. Zustand is the answer for that.
