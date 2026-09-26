# Code Style

Rules that ESLint and Prettier can't fully enforce. Reviewers cite this document during PR review; new contributors read it before their first PR.

## Language policy

**English for everything in code** — no exception by layer or identifier kind. Spanish is reserved for what the end user reads.

| Language    | Used for                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **English** | Every identifier: domain entities and value objects, use cases, DB tables and columns, REST URL segments, file names, commit messages, branch names, code comments, documentation |
| **Spanish** | User-facing strings only: interface copy, error messages shown on screen, questionnaire text, and catalog data values (`name_es`, descriptions)                                |

### Examples

```ts
// ✓ correct: English everywhere in code
class Diagnosis { /* ... */ }
class TypeOrmDiagnosisRepository implements DiagnosisRepositoryPort { /* ... */ }
class Statement { /* ... */ }

// REST URLs in English
GET /api/v1/diagnostics/:id/questionnaire

// DB columns in English (snake_case)
CREATE TABLE answer (
  id UUID PRIMARY KEY,
  id_diagnostic UUID NOT NULL,
  id_statement BIGINT NOT NULL,
  likert_value SMALLINT NOT NULL
);

// ✗ wrong: Spanish identifiers
class Diagnostico { /* ... */ }
class Afirmacion { /* ... */ }

// ✗ wrong: mixing inside one identifier
class DiagnosticoRepository { /* ... */ }
```

### Borderline cases

- **Domain enums with technical names**: dimension codes (`TRL`, `CRL`, `BRL`, etc.) stay as-is because they are acronyms defined by the KTH framework.
- **Business errors**: the class name is English (`QuestionnaireIncompleteError`); the message a user reads on screen is Spanish and comes from the presentation layer, not from the domain identifier.
- **Frontend routes** (`/diagnosticos/:id/recomendacion`) are user-visible URLs, not API identifiers; they follow the product language (Spanish).

### When in doubt

Ask: _"does an end user read this?"_ If yes → Spanish, as copy. If it is an identifier, a file, a table, a column, a route of the API, or a comment → English.

## TypeScript conventions

### Use `strict` and treat warnings as errors

`tsconfig.base.json` already enables:

- `strict`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noImplicitOverride`
- `noFallthroughCasesInSwitch`

Don't disable any of these locally. If a real-world need to disable surfaces, raise it with the team — there's almost always a better pattern.

### No `any`. Ever.

```ts
// ✗ banned
function process(data: any) {
  /* ... */
}

// ✓ if you don't know the shape, use unknown and narrow
function process(data: unknown) {
  if (isAnswerSheet(data)) {
    // typed as AnswerSheet here
  }
}

// ✓ generic if the shape is parametric
function process<T>(data: T) {
  /* ... */
}
```

ESLint enforces this with `@typescript-eslint/no-explicit-any: error`.

### Prefer `type` over `interface` unless extending

- Use `type` for data shapes, unions, intersections.
- Use `interface` only when you need declaration merging (rare) or when defining a port/contract that may be implemented (`AnswerSheetRepositoryPort` is an interface).

```ts
// ✓ data shape
type DimensionResult = {
  dimensionCode: DimensionCode;
  averageLikert: number;
  irlLevel: IrlLevel;
};

// ✓ port (interface, implementable)
export interface AnswerSheetRepositoryPort {
  save(sheet: AnswerSheet): Promise<void>;
}
```

### Imports

- Use `type`-only imports when the import is purely a type. ESLint enforces this with `@typescript-eslint/consistent-type-imports`.
- Group imports: third-party first, then workspace (`@innlab/*`), then relative.
- Sort within groups alphabetically.

```ts
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { likertValueSchema } from '@innlab/contracts';

import type { AnswerSheetRepositoryPort } from '../../domain/repositories/answer-sheet.repository.port.js';
import { AnswerSheet } from '../../domain/entities/answer-sheet.aggregate.js';
```

### No default exports

Default exports break IDE refactor tooling (renames, find-references) and force inconsistent naming across importers.

```ts
// ✗ banned
export default class SubmitQuestionnaireUseCase {
  /* ... */
}

// ✓ named export
export class SubmitQuestionnaireUseCase {
  /* ... */
}
```

**Exceptions:** React route components that use `React.lazy()`, and Vite/Vitest config files.

### One concern per file

A use case file exports the use case class. The DTO has its own file. The error has its own file. Don't merge unrelated concerns even if "they're related."

```ts
// ✓
// application/use-cases/submit-questionnaire.use-case.ts
export class SubmitQuestionnaireUseCase {
  /* ... */
}

// application/dto/submit-questionnaire.command.ts
export type SubmitQuestionnaireCommand = {
  /* ... */
};

// domain/errors/questionnaire-incomplete.error.ts
export class QuestionnaireIncompleteError extends DomainError {
  /* ... */
}
```

### Async/await over Promise chains

```ts
// ✓
const sheet = await repository.findByDiagnosticId(id);

// ✗
repository.findByDiagnosticId(id).then((sheet) => {
  /* ... */
});
```

ESLint's `no-floating-promises` rule catches forgotten awaits. Don't suppress it.

## File naming

| Kind                    | Pattern                                                   | Example                                |
| ----------------------- | --------------------------------------------------------- | -------------------------------------- |
| TypeScript files        | kebab-case                                                | `submit-questionnaire.use-case.ts`     |
| React components        | PascalCase                                                | `StatementCard.tsx`, `LikertScale.tsx` |
| React hooks             | camelCase, `use` prefix                                   | `useQuestionnaireDraft.ts`             |
| Test files              | `<source>.spec.ts` or `<source>.test.tsx`                 | `irl-calculator.service.spec.ts`       |
| E2E test files          | `<scenario>.e2e-spec.ts`                                  | `submit-questionnaire.e2e-spec.ts`     |
| TypeORM entity files    | `<name>.orm-entity.ts`                                    | `respuesta.orm-entity.ts`              |
| Zod schema files        | `<name>.schema.ts`                                        | `submission.schema.ts`                 |
| Tailwind config         | `tailwind.config.ts`                                      | —                                      |
| CVA variant definitions | `<component>.variants.ts` (co-located with the component) | `button.variants.ts`                   |

## Naming patterns

### Backend

| Construct        | Pattern                                                         | Example                         |
| ---------------- | --------------------------------------------------------------- | ------------------------------- |
| Use case class   | `<Verb><Noun>UseCase`                                           | `SubmitQuestionnaireUseCase`    |
| Use case method  | always `execute(command)`                                       | —                               |
| Repository port  | `<Aggregate>RepositoryPort`                                     | `DiagnosisRepositoryPort`     |
| Repository impl  | `TypeOrm<Aggregate>Repository`                                  | `TypeOrmDiagnosisRepository`  |
| External port    | `<Service>Port`                                                 | `UserContextPort`, `DiagnosticOwnershipPort` |
| External adapter | `<Technology><Service>Adapter` or `<Technology><Service>Client` | `InnlabCoreHttpClient`          |
| Adapter over another module's query | `<Source><Purpose>Adapter`                       | `DiagnosisOwnershipAdapter`     |
| Exported read query | `<Verb><Noun>Query`                                          | `FindDiagnosisOwnerQuery`       |
| HTTP request DTO | `<Noun>RequestDto` (class-validator)                            | `AnswersRequestDto`             |
| HTTP param DTO   | `<Noun>Param`                                                   | `DiagnosticIdParam`             |
| HTTP response DTO | `<Noun>ResponseDto`, implements the contract type              | `MaturityProfileResponseDto`    |
| Domain error     | `<Description>Error`                                            | `QuestionnaireIncompleteError`  |
| Value object     | PascalCase, noun                                                | `LikertValue`, `IrlLevel`       |
| Aggregate root   | PascalCase, noun                                                | `AnswerSheet`, `Diagnosis`    |

### Frontend

| Construct          | Pattern                      | Example                                                      |
| ------------------ | ---------------------------- | ------------------------------------------------------------ |
| Component          | PascalCase                   | `StatementCard`, `RadarChart`                                |
| Page component     | PascalCase, `Page` suffix    | `ResultsPage`                                                |
| Custom hook        | camelCase, `use` prefix      | `useQuestionnaireCompletion`                                 |
| Zustand store hook | camelCase, `use…Store`       | `useQuestionnaireDraftStore`                                 |
| API function       | camelCase, verb              | `finalizeDiagnostic`, `getScalingRoadmap`                    |
| Zod schema         | camelCase, `Schema` suffix   | `answerItemSchema`                                           |
| Type from schema   | PascalCase, no `Type` suffix | `AnswerItem`                                                 |

## Folder structure rules

### Backend modules

Inside each `modules/<name>/` folder (and the two `shared/` contexts, `irl-taxonomy` and `identity`):

```
domain/              # framework-free: entities, value-objects, services, exceptions, repositories (ports), events
application/         # depends on domain only, no framework: use-cases, dtos, ports
infrastructure/      # depends on domain + application: database/{orm-entities,repositories}, messaging, integrations, adapters
presentation/        # depends on application only: controllers and their dto/
<name>.module.ts     # wires use cases with applicationProvider(UseCase, [tokens])
README.md            # scope, rules, completeness, exposed API, dependencies, owned data, tests
```

`presentation/` never imports from `domain/` or `infrastructure/`; `eslint-plugin-boundaries` fails the lint if it does. Ports live in `domain/repositories/` (not `domain/ports/`); a port whose result is an application DTO (another module's read model, such as `UserDiagnosesPort`) lives in `application/ports/`.

**The application layer is framework-free** ([ADR 0005](../architecture/decisions/0005-framework-free-application-layer.md)). A use case is a plain class: no `@Injectable`, no `@Inject`, no `@nestjs/*`, `typeorm` or HTTP client import (the lint bans them in `application/` as in `domain/`). Its constructor takes its ports; the module builds it with `applicationProvider(UseCase, [TOKEN_A, TOKEN_B])` (`shared/kernel/infrastructure/nest/application-provider.ts`), listing the tokens in constructor order. A use case publishes events through the `EVENT_PUBLISHER` port, never through `EventEmitter2`.

**Using another module:** import its module and inject one of the read queries it exports, behind a port declared in the consumer and implemented by an adapter in the consumer's `infrastructure/`. Never its repositories, its ORM entities or its write use cases; a reaction to what another module did is a domain event.

**Request validation** happens at the HTTP boundary with class-validator DTOs; invariants stay in the domain ([ADR 0006](../architecture/decisions/0006-validation-at-the-http-boundary.md)). Shared pieces of `presentation/` (the `DiagnosticIdParam` DTO, `ApiErrors(...)`) live in `shared/kernel/presentation/`. Events that cross modules live in `shared/kernel/events/`. The global technical layers (migrations, seeds, HTTP filters) live in `shared/kernel/infrastructure/`, not in a top-level `infrastructure/` folder.

Don't introduce new top-level folders inside a module without discussion. If you find yourself wanting `services/` at the module root, decide whether it's domain or infrastructure and place it there.

### Frontend features

Inside each `features/<name>/` folder:

```
api/                 # API functions, parsed with @innlab/contracts schemas
components/          # feature-private components
hooks/               # feature-private hooks
store/               # zustand draft (only if needed)
lib/ or utils/       # pure helpers
index.ts             # public surface — only export what pages need
```

## Documentation

What can be derived from the code is not written by hand: the endpoints are Swagger (`/api/docs`), the folder tree is the repository, the schema is the single migration. What the code cannot say is written once, next to what it explains:

| What | Where |
| --- | --- |
| Why a non-obvious design decision was taken | An ADR in [`docs/architecture/decisions/`](../architecture/README.md): context, decision, consequences. Immutable once accepted; a later change is a new ADR that supersedes it |
| Why a domain invariant is the way it is | A short comment next to the invariant, in `domain/` |
| Project conventions | One file per kind in `docs/conventions/`, with a correct and a wrong example |
| A backend module's scope and rules | The `README.md` at the root of the module, with the template below |

Every backend module (`modules/<name>/`, `shared/irl-taxonomy/`, `shared/identity/`) has a `README.md` with exactly these sections, in this order:

```markdown
# <module>

## Scope
What business responsibility it covers and, explicitly, what it does not (the boundary with its neighbours).

## Rules that must hold
The business invariants and architecture constraints specific to this module that a change cannot break without a conscious decision. Not the generic rules of this file.

## Completeness
What part of the scope is implemented today and what is missing, referring to user stories or known findings — never a loose "stage 1".

## Responsibility (ubiquitous language)
The capability, in the words someone at INNLAB would use.

## Domain concepts
The aggregates, entities and value objects this module owns.

## What it exposes
The exported queries, events and HTTP endpoints others may use. Anything not listed is internal.

## What it depends on
Other modules' exported queries or ports it consumes — and any violation, so it stays visible.

## Data it owns
The tables it writes, and the catalogs it owns through seeds.

## Test coverage
What exists per tier (unit, integration, e2e) and what is explicitly missing.
```

A change is not done while it leaves documentation stale: a change that alters a module's scope, rules, exposed API or completeness updates its `README.md` in the same commit.

## Comments

- Comments explain **why**, not **what**. The code already shows what.
- TODO comments require a Jira ticket reference: `// TODO(IRL-42): handle the leap-year edge case`.
- No commented-out code in commits. Git remembers; if you might need it back, that's what history is for.
- Public types and exported functions in the contracts package have TSDoc comments. Internal code doesn't need them unless the intent isn't obvious.

```ts
/**
 * Likert scale value used in the IRL questionnaire.
 * Range: 1 (Totalmente en desacuerdo) to 5 (Totalmente de acuerdo).
 */
export const likertValueSchema = z.number().int().min(1).max(5);
```

## Logging

- Backend: inject `Logger` from `nestjs-pino`. **Never** `console.log` in production code.
- Frontend: `console.warn` and `console.error` only. `console.log` is banned by ESLint.

```ts
// ✓
this.logger.info({ diagnosticId, dimensionCount: results.length }, 'maturity profile computed');

// ✗ banned
console.log('profile computed:', results);
```

## Constants and magic numbers

Domain magic numbers go into named constants in the shared kernel or contracts:

```ts
// ✓
export const TOTAL_STATEMENTS = 48;
export const STATEMENTS_PER_DIMENSION = 8;

// ✗
if (answers.length !== 48) {
  /* ... */
}
```

The conversion table itself lives in the catalog seed, not as constants in code.
