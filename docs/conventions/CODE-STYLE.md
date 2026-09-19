# Code Style

Rules that ESLint and Prettier can't fully enforce. Reviewers cite this document during PR review; new contributors read it before their first PR.

## Language policy

**English for everything in code** — no exception by layer or identifier kind (`convenciones-objetivo.md` §3). Spanish is reserved for what the end user reads.

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
| External port    | `<Service>Port`                                                 | `MailerPort`, `UserContextPort` |
| External adapter | `<Technology><Service>Adapter` or `<Technology><Service>Client` | `InnlabCoreHttpClient`          |
| HTTP DTO input   | `<Verb><Noun>Dto`                                               | `SubmitQuestionnaireDto`        |
| HTTP DTO output  | `<Noun>Response`                                                | `MaturityProfileResponse`       |
| Domain error     | `<Description>Error`                                            | `QuestionnaireIncompleteError`  |
| Value object     | PascalCase, noun                                                | `LikertValue`, `IrlLevel`       |
| Aggregate root   | PascalCase, noun                                                | `AnswerSheet`, `Diagnosis`    |

### Frontend

| Construct          | Pattern                      | Example                                                      |
| ------------------ | ---------------------------- | ------------------------------------------------------------ |
| Component          | PascalCase                   | `StatementCard`, `RadarChart`                                |
| Page component     | PascalCase, `Page` suffix    | `QuestionnairePage`                                          |
| Custom hook        | camelCase, `use` prefix      | `useQuestionnaireDraft`                                      |
| Zustand store hook | camelCase, `use` prefix      | `useQuestionnaireDraft` (same as a regular hook — by design) |
| API function       | camelCase, verb              | `submitQuestionnaire`, `getProfile`                          |
| Zod schema         | camelCase, `Schema` suffix   | `answerItemSchema`                                           |
| Type from schema   | PascalCase, no `Type` suffix | `AnswerItem`                                                 |

## Folder structure rules

### Backend modules

Inside each `modules/<name>/` folder (and the two `shared/` contexts, `irl-taxonomy` and `identity`):

```
domain/              # framework-free: entities, value-objects, services, exceptions, repositories (ports), events
application/         # depends on domain: use-cases, dtos
infrastructure/      # depends on domain + application: database/{orm-entities,repositories}, messaging, integrations
presentation/        # depends on application only: controllers
<name>.module.ts
README.md            # scope, rules, exposed API, tests (convenciones-objetivo.md §4.4)
```

`presentation/` never imports from `domain/` or `infrastructure/`; `eslint-plugin-boundaries` fails the lint if it does. Ports live in `domain/repositories/` (not `domain/ports/`). Events that cross modules live in `shared/kernel/events/`. The global technical layers (migrations, seeds, HTTP filters) live in `shared/kernel/infrastructure/`, not in a top-level `infrastructure/` folder.

Don't introduce new top-level folders inside a module without discussion. If you find yourself wanting `services/` at the module root, decide whether it's domain or infrastructure and place it there.

### Frontend features

Inside each `features/<name>/` folder:

```
api/                 # API functions
components/          # feature-private components
hooks/               # feature-private hooks
store/               # zustand store (only if needed)
schemas/             # zod schemas (re-export from @innlab/contracts when shared)
utils/               # pure helpers
index.ts             # public surface — only export what other features/pages need
```

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
