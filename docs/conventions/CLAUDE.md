# CLAUDE.md

Context for AI assistants (Claude Code, Cursor, etc.) working in the `diagnostico-irl` monorepo. Treat this as binding context — the rules here override any defaults you'd otherwise apply.

## Project in one paragraph

This is the **IRL Diagnostic System**, a web application for the INNLAB center at Universidad Icesi. A user (the "Líder de Iniciativa") answers a 48-statement questionnaire organized in six dimensions of the **KTH Innovation Readiness Level** framework; the system computes a maturity profile on a 1–9 scale per dimension. Phase 1 implements user stories from epics **E-03 (Cuestionario IRL)** and **E-04 (Diagnóstico inicial de madurez)**. Authentication is delegated to **Keycloak** via OIDC; user context comes from the **InnLab Core** API.

## Repo layout

```
diagnostico-irl/
├── apps/
│   ├── api/        @innlab/api      — NestJS + Fastify + TypeORM + Postgres
│   └── web/        @innlab/web      — React + Vite + React Query + Zustand
├── packages/
│   └── contracts/  @innlab/contracts — Shared Zod schemas (source of truth)
└── docs/                              — Architecture, conventions, workflows
```

Each app has its own `CLAUDE.md` with stricter, package-specific rules. **Read the package-level `CLAUDE.md` before editing inside that package.**

## Non-negotiable domain facts

These are encoded in the KTH IRL framework and the SRS. They are not opinions.

- **Six dimensions**, with these exact codes: `TRL`, `CRL`, `BRL`, `IPRL`, `TmRL`, `FRL`.
- **Eight statements per dimension**, **48 total**. Never a different count.
- **Likert scale is 1..5**. Reject any other value at the boundary.
- **IRL scale is 1..9**. Reject any other value.
- **Conversion table is fixed** (SA-06):

  | Average   | IRL | Average   | IRL |
  | --------- | --- | --------- | --- |
  | 1.00–1.39 | 1   | 3.00–3.39 | 6   |
  | 1.40–1.79 | 2   | 3.40–3.79 | 7   |
  | 1.80–2.19 | 3   | 3.80–4.39 | 8   |
  | 2.20–2.59 | 4   | 4.40–5.00 | 9   |
  | 2.60–2.99 | 5   |           |     |

- **Imbalance pairs are exactly six**: TRL–CRL, TRL–BRL, CRL–BRL, TmRL–FRL, BRL–IPRL, TRL–IPRL. Never evaluate other pairs.
- **Imbalance classification**: difference > 3 = critical, 2–3 = moderate, < 2 = acceptable.
- **Bottleneck rule** (RF-08): the dimension(s) with the lowest level. **If there's a tie, report all tied dimensions** — not just one.

Authoritative source: [`docs/architecture/domain-model.md`](./docs/architecture/domain-model.md). If your code contradicts that file, the file wins.

## Architectural rules

- **Modular monolith with DDD-lite.** One NestJS module = one bounded context.
- **Domain layer imports nothing from frameworks.** No `@nestjs/*`, no `typeorm`, no `axios`, no `react`. Only TypeScript primitives, value objects, and other domain code.
- **Use cases are single-responsibility classes** with one public method `execute(command)`.
- **Repositories implement ports** declared in `domain/ports/`. Application code depends on the port, never on the concrete adapter.
- **Modules communicate by ID only.** Never pass entity objects across module boundaries.
- **The Diagnostic module is the orchestrator.** Other modules never call each other directly; the orchestrator composes them.
- **Catalogs (`irl_catalog` schema) are read-only at runtime.** Application code reads, never writes. Updates go through seeds, gated by migrations.

## Language conventions

This is a bilingual codebase. The split is deliberate, not negotiable:

| Language    | Used for                                                                                                                                                                           |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spanish** | Domain entities, DB tables/columns, REST URLs, business terms in code (`Diagnostico`, `Iniciativa`, `Afirmacion`, `Respuesta`, `cuello de botella`)                                |
| **English** | Infrastructure code, framework constructs, technical terms (`Repository`, `UseCase`, `Controller`, `Port`, `Adapter`), commit messages, branch names, documentation, code comments |

Examples:

```ts
// Correct — Spanish for domain, English for infrastructure
class Diagnostico { /* ... */ }
class TypeOrmDiagnosticoRepository implements DiagnosticoRepositoryPort { /* ... */ }

// Wrong — translating the domain term loses meaning
class Diagnostic { /* ... */ }

// Wrong — mixing inside the same identifier
class DiagnosticoRepositorio { /* ... */ }
```

See [`docs/conventions/code-style.md`](./docs/conventions/code-style.md) for the full ruleset.

## Hard prohibitions

Do **not**:

- Enable TypeORM `synchronize: true` anywhere. Schema changes go through migrations only.
- Implement password hashing, login forms, or session management. Keycloak owns auth.
- Use the user's JWT to call the InnLab Core API. Use service credentials via `client_credentials` (RNF-05).
- Cache JWTs in the database. Tokens stay in memory only.
- Modify catalog data from application code. Catalogs change through seeds, period.
- Introduce default exports outside React route components.
- Use `any` to silence the type checker. Use `unknown` and narrow.
- Mix Zustand and React Query for the same piece of state. Server state → React Query. UI/draft state → Zustand. See [`apps/web/docs/state-management.md`](./apps/web/docs/state-management.md).
- Commit secrets. `.env.local` is gitignored; `.env.example` is what you commit.
- Cross feature boundaries on the frontend. `features/questionnaire` cannot import from `features/maturity-profile`; both go through `shared/` if reuse is needed.

## Conventions for branches, commits, PRs

- **Branches**: `IRL-<jira-id>-<short-summary>` from `dev`. See [`docs/conventions/BRANCH-NOTATION.md`](./docs/conventions/BRANCH-NOTATION.md).
- **Commits**: `<type>: <action> + [<scope>] - [<description>]`, English, all lowercase. Enforced by commitlint. See [`docs/conventions/STANDARD-COMMIT.md`](./docs/conventions/STANDARD-COMMIT.md).
- **PRs**: link the HU-xx ticket, tick the checklist. See [`docs/conventions/pull-requests.md`](./docs/conventions/pull-requests.md).

## When uncertain

1. Check [`docs/architecture/overview.md`](./docs/architecture/overview.md) for architectural intent.
2. Check [`docs/architecture/decisions/`](./docs/architecture/decisions/) for the *why* behind a choice.
3. Check the relevant package-level `CLAUDE.md`.
4. Check the SRS or backlog inside the project knowledge if the question is about requirements.
5. **Ask the user.** Do not silently break a documented rule because it seems inconvenient.

## What "done" looks like for a change

A change is complete when **all** of these are true:

- TypeScript types pass (`pnpm typecheck`).
- ESLint passes (`pnpm lint`).
- Relevant tests pass (`pnpm test`).
- Tests have been added or updated to cover the change.
- Documentation has been updated if the change affects behavior, contracts, or conventions.
- The commit message follows the standard.
- The branch name follows the standard.
- No `console.log` or debug statements remain.
- No `synchronize: true`, no hardcoded secrets, no `any` types added.