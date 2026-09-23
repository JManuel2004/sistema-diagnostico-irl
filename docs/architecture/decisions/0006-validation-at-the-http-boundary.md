# 0006 — Request DTOs validated with class-validator, answering 422

**Status:** accepted

## Context

Controllers declared their bodies as TypeScript interfaces, so the global `ValidationPipe` had nothing to validate: a malformed body reached the domain. The request and response shapes are defined once, as Zod schemas, in `@innlab/contracts`, and the API documents itself with Swagger.

## Decision

- Each endpoint that takes a body or route parameters receives a DTO class in its module's `presentation/controllers/dto/`, validated by `class-validator` and documented with `@ApiProperty`. Where the contract's type allows it, the DTO `implements` it, so a change in the contract breaks the build until the DTO follows it (the consent and initiative bodies do; the answers do not, because the contract types the Likert value as a literal union the DTO receives as a number before validating it). Response DTOs exist only to document the answer in Swagger and also `implement` the contract.
- The DTO checks shape and limits (types, formats, lengths, ranges). Business rules — a blank justification, exactly 48 answers, an existing catalog id, the current consent version — stay in the domain and the use cases.
- A body that fails the DTO answers **422** with `code: VALIDATION_FAILED`, the same status the domain gives for a rule it rejects (`INVARIANT_VIOLATION`): both mean the content breaks the contract.
- Controllers map DTOs to plain commands; `application/` never sees a DTO class.
- Swagger: Nest builds the OpenAPI document from controllers and DTOs, `@fastify/swagger` publishes it and `@fastify/swagger-ui` serves it at `/api/docs` (JSON at `/api/docs/json`).

## Consequences

- Shared presentation helpers live in `shared/kernel/presentation/` (`DiagnosticIdParam`, the `ApiErrors()` decorator).
- `forbidNonWhitelisted` rejects unknown fields.
