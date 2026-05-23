# apps/api/CLAUDE.md

Backend-specific rules. Read [the root `CLAUDE.md`](../../CLAUDE.md) first; this file adds backend-only constraints on top of it.

## Stack assumptions

- NestJS 10+ on **Fastify** (not Express). When you reach for an Express-style API, stop — use the Fastify equivalent. `@nestjs/platform-express` is not installed and will not be.
- TypeORM. Entities live in `<module>/infrastructure/persistence/*.orm-entity.ts`.
- ESM (`"type": "module"` in package.json). Imports use `.js` extensions in source even for `.ts` files (NodeNext resolution). Yes, it looks odd; it's correct.

## Layer rules (enforced by ESLint)

```
interfaces  →  application  →  domain  ←  infrastructure
```

| Layer             | Can import from                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `domain/`         | `domain/`, `shared-kernel/` only                                                                |
| `application/`    | `application/`, `domain/`, `shared-kernel/`                                                     |
| `infrastructure/` | `infrastructure/`, `application/`, `domain/`, `shared-kernel/`                                  |
| `interfaces/`     | `interfaces/`, `application/`, `shared-kernel/` (never `domain/` or `infrastructure/` directly) |

**Specifically forbidden imports from `domain/` and `application/` code:**

- `@nestjs/*` (any sub-package)
- `typeorm` and any TypeORM type
- `@fastify/*`
- `axios`, `undici`, any HTTP client
- `nodemailer`
- `pino`, any logger
- Node built-ins that imply IO: `fs`, `node:fs`, `http`, `https`, `net`

Domain code uses TypeScript primitives, value objects, and other domain code only. No exceptions.

## Module skeleton

When you create a new module, the skeleton is:

```
modules/<bounded-context>/
├── domain/
│   ├── entities/             # aggregate roots, entities
│   ├── value-objects/
│   ├── services/             # pure domain services
│   ├── events/               # domain events (POJOs)
│   ├── errors/               # specific domain errors
│   └── ports/                # interfaces — repository ports, external service ports
├── application/
│   ├── use-cases/            # one class per use case, `execute(command)` method
│   └── dto/                  # commands and queries (POJOs, not class-validator)
├── infrastructure/
│   ├── persistence/          # TypeORM entities + repository implementations
│   └── (other adapters)
├── interfaces/
│   └── http/
│       ├── *.controller.ts
│       └── dto/              # class-validator DTOs at HTTP boundary
└── <bounded-context>.module.ts
```

## Naming conventions

| What                        | Pattern                                            | Example                                    |
| --------------------------- | -------------------------------------------------- | ------------------------------------------ |
| Use case class              | `<Verb><Noun>UseCase`                              | `SubmitQuestionnaireUseCase`               |
| Use case method             | always `execute(command)`                          | —                                          |
| Repository port (interface) | `<Aggregate>RepositoryPort`                        | `DiagnosticoRepositoryPort`                |
| Repository implementation   | `TypeOrm<Aggregate>Repository`                     | `TypeOrmDiagnosticoRepository`             |
| External port (interface)   | `<Service>Port`                                    | `MailerPort`, `UserContextPort`            |
| ORM entity                  | `<Name>.orm-entity.ts` (file), `<Name>Orm` (class) | `respuesta.orm-entity.ts` → `RespuestaOrm` |
| HTTP DTO (input)            | `<Verb><Noun>Dto`                                  | `SubmitQuestionnaireDto`                   |
| HTTP DTO (output)           | `<Noun>Response`                                   | `MaturityProfileResponse`                  |
| Domain error                | `<Description>Error`                               | `QuestionnaireIncompleteError`             |

## Domain vs infrastructure naming language

Spanish for domain (entities, columns, REST paths). English for infrastructure (Repository, Port, UseCase). Examples in the root `CLAUDE.md` and [`docs/conventions/code-style.md`](../../docs/conventions/code-style.md).

## Use case shape

Every use case follows the same shape. Don't deviate.

```ts
// application/use-cases/submit-questionnaire.use-case.ts
import { Injectable, Inject } from '@nestjs/common';
import { ANSWER_SHEET_REPOSITORY } from '../../domain/ports/answer-sheet.repository.port.js';
import type { AnswerSheetRepositoryPort } from '../../domain/ports/answer-sheet.repository.port.js';
import type { SubmitQuestionnaireCommand } from '../dto/submit-questionnaire.command.js';
import { AnswerSheet } from '../../domain/entities/answer-sheet.aggregate.js';
import { CompletenessChecker } from '../../domain/services/completeness-checker.service.js';
import { QuestionnaireIncompleteError } from '../../domain/errors/questionnaire-incomplete.error.js';

@Injectable()
export class SubmitQuestionnaireUseCase {
  constructor(
    @Inject(ANSWER_SHEET_REPOSITORY)
    private readonly repository: AnswerSheetRepositoryPort,
    private readonly completeness: CompletenessChecker,
  ) {}

  async execute(command: SubmitQuestionnaireCommand): Promise<void> {
    const sheet = AnswerSheet.create(command.diagnosticId, command.answers);
    const report = this.completeness.check(sheet);
    if (!report.isComplete) {
      throw new QuestionnaireIncompleteError(report.missing);
    }
    await this.repository.save(sheet);
  }
}
```

Notes:

- Constructor injection only.
- The port is injected by **symbol** (`ANSWER_SHEET_REPOSITORY`), not by class. This is what lets the domain own the interface and infrastructure provide the binding.
- Domain errors are thrown raw; the global `DomainExceptionFilter` translates them to HTTP responses. **Never** throw `HttpException` from a use case.

## Repository pattern

The port lives in `domain/ports/`:

```ts
// domain/ports/answer-sheet.repository.port.ts
import type { AnswerSheet } from '../entities/answer-sheet.aggregate.js';

export const ANSWER_SHEET_REPOSITORY = Symbol('ANSWER_SHEET_REPOSITORY');

export interface AnswerSheetRepositoryPort {
  findByDiagnosticId(diagnosticId: string): Promise<AnswerSheet | null>;
  save(sheet: AnswerSheet): Promise<void>;
}
```

The implementation lives in `infrastructure/persistence/`:

```ts
// infrastructure/persistence/typeorm-answer-sheet.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AnswerSheetRepositoryPort } from '../../domain/ports/answer-sheet.repository.port.js';
import { RespuestaOrm } from './respuesta.orm-entity.js';
import { AnswerSheet } from '../../domain/entities/answer-sheet.aggregate.js';

@Injectable()
export class TypeOrmAnswerSheetRepository implements AnswerSheetRepositoryPort {
  constructor(
    @InjectRepository(RespuestaOrm)
    private readonly orm: Repository<RespuestaOrm>,
  ) {}

  async findByDiagnosticId(diagnosticId: string): Promise<AnswerSheet | null> {
    const rows = await this.orm.find({ where: { diagnosticoId: diagnosticId } });
    return rows.length === 0 ? null : AnswerSheet.fromPersistence(diagnosticId, rows);
  }

  async save(sheet: AnswerSheet): Promise<void> {
    const rows = sheet.toPersistence();
    await this.orm.manager.transaction(async (manager) => {
      await manager.delete(RespuestaOrm, { diagnosticoId: sheet.diagnosticId });
      await manager.insert(RespuestaOrm, rows);
    });
  }
}
```

The mapping between ORM rows and domain entities lives in static factory methods on the domain entity (`fromPersistence`) and an instance method (`toPersistence`). **Do not** let ORM types leak into the domain.

The module wires the binding:

```ts
// questionnaire.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([RespuestaOrm])],
  providers: [
    SubmitQuestionnaireUseCase,
    CompletenessChecker,
    { provide: ANSWER_SHEET_REPOSITORY, useClass: TypeOrmAnswerSheetRepository },
  ],
  controllers: [QuestionnaireController],
})
export class QuestionnaireModule {}
```

## Validation

Two layers:

1. **`class-validator` decorators on HTTP DTOs** (`interfaces/http/dto/*.dto.ts`). Runs in the global `ValidationPipe`. Powers OpenAPI generation.
2. **Domain invariants enforced in value objects and aggregates.** A `LikertValue.create(6)` throws — the type system can't catch that, the constructor can.

For payloads shared with the frontend, the Zod schema in `@innlab/contracts` is the **source of truth**. The class-validator DTO is mechanical translation; the Zod schema is consulted via the `ZodValidationPipe` for cross-tier consistency.

## Error handling

- **Validation errors** (class-validator) → 400 via `ValidationExceptionFilter`.
- **Domain errors** (`DomainError` subclass) → mapped to status by the `DomainExceptionFilter`:
  - `InvariantViolationError` → 422
  - `NotFoundError` → 404
  - `ForbiddenError` → 403
  - `ConflictError` → 409
- **Unexpected errors** → 500 via `GlobalExceptionFilter`. Full error + stack to logs with correlation ID. Generic problem document to client.

Every error response follows **RFC 7807** with a project-specific `code` field. See [`docs/error-codes.md`](./docs/error-codes.md) for the catalog.

## Testing pattern reminders

- Unit tests for domain are **synchronous and pure**. No `async`, no mocks beyond stubs.
- Use cases test against **port stubs**, not real repositories.
- Integration tests use **Testcontainers**. Spin up Postgres in `beforeAll`, drop in `afterAll`, truncate tables in `beforeEach`.
- E2E tests use **supertest** + **nock**. Mock Keycloak JWKS, mock InnLab Core, real DB.
- The IRL calculator gets **property-based tests** with `fast-check`. Any 48 valid Likert answers produce six IRL levels in 1..9.

Recipes: [`docs/testing-recipes.md`](./docs/testing-recipes.md).

## Hard prohibitions specific to backend

In addition to the root list:

- No `synchronize: true` on TypeORM DataSource. Ever.
- No raw SQL outside repositories. If you need it, encapsulate it behind a repository method.
- No business logic in controllers. Controllers translate HTTP ↔ command, nothing more.
- No `HttpException` thrown from domain or application layers. Throw a `DomainError`; let the filter handle it.
- No `process.env.XXX` reads outside `config/`. Use the typed `ConfigService`.
- No `console.log`. Use the injected `Logger` from Pino.
- No catalog writes from application code. If you need new catalog data, write a seed.