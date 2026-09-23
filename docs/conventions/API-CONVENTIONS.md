# API Design

REST conventions for the `@innlab/api` backend. These rules apply to every endpoint under `/api/v1/`.

## Foundational rules

1. **REST, not RPC.** URLs are resources, not actions.
2. **Versioned at the path.** Every endpoint is prefixed `/api/v1/`. When a breaking change is unavoidable, add `/api/v2/` — never break `/api/v1/`.
3. **English for URL segments**, like every other identifier in the code (see `CODE-STYLE.md`). Only user-facing strings stay in Spanish.
4. **camelCase for JSON keys.** Frontend convention.
5. **RFC 7807 Problem Details for all errors.** With a project-specific `code` field for machine consumption.
6. **Authenticated by default.** Every endpoint requires a valid JWT unless explicitly opted out (`@Public()` decorator).
7. **Authorize at the resource level.** Use cases verify that the resource exists and belongs to the caller before acting, and answer `NotFoundError` / `ForbiddenError` (see `initiative/`'s `DiagnosticOwnershipPort`).

## URL conventions

### Resources are plural nouns in English

```
GET    /api/v1/diagnostics                   ✓
GET    /api/v1/diagnosticos                  ✗ (Spanish)
GET    /api/v1/diagnostic                    ✗ (singular)

GET    /api/v1/catalog/questionnaire         ✓
GET    /api/v1/catalogo/cuestionario         ✗ (Spanish)
```

A resource that is a singleton under its parent (there is one consent and one initiative per diagnostic) is singular: `diagnostics/:id/consent`, `diagnostics/:id/initiative`.

### Hierarchical when the relationship demands it

```
POST   /api/v1/diagnostics/:id/consent             ✓
POST   /api/v1/diagnostics/:id/initiative          ✓
POST   /api/v1/diagnostics/:id/questionnaire       ✓
GET    /api/v1/diagnostics/:id/profile             ✓
```

The hierarchy reflects the **aggregate boundary**: consent, initiative, questionnaire submission, and profile all belong to a diagnostic.

### Action endpoints when REST forces an awkward verb

REST is "create / read / update / delete." Some operations don't fit cleanly:

```
POST   /api/v1/diagnostics/:id/finalize-initial       ✓ (finalize is an action)
POST   /api/v1/diagnostics/:id/deep-analysis          ✓ (accepting deep analysis is an action)
```

When you need an action, **make it explicit as a sub-resource verb at the end** (`/finalize-initial`, `/deep-analysis`), in English and kebab-case.

### What not to do

```
GET    /api/v1/getDiagnostics               ✗ (verbs in URLs)
POST   /api/v1/diagnostic/create            ✗ (verbs in URLs)
GET    /api/v1/diagnostics?action=submit    ✗ (RPC over query string)
DELETE /api/v1/diagnostics/:id/answers/all ✗ (use the parent resource: DELETE /answers)
```

## HTTP methods

| Method   | Use for                                                                        |
| -------- | ------------------------------------------------------------------------------ |
| `GET`    | Read a resource. Idempotent. No side effects.                                  |
| `POST`   | Create a resource OR invoke an action endpoint                                 |
| `PUT`    | Replace a resource entirely. Idempotent.                                       |
| `PATCH`  | Partial update. Rare in this codebase — favor PUT or explicit action endpoints |
| `DELETE` | Remove a resource. Idempotent (404 on second call is correct).                 |

## Request and response shapes

### Request body: camelCase JSON

```json
POST /api/v1/diagnostics/abc/questionnaire

{
  "answers": [
    { "statementId": "...", "value": 4 },
    { "statementId": "...", "value": 2 }
  ]
}
```

Note: `statementId`, not `afirmacionId`. JSON keys are English camelCase, like URL segments and every other identifier; only the values a user reads (the justification text, catalog names) are Spanish.

### Response body: camelCase JSON

```json
GET /api/v1/diagnostics/abc/profile

{
  "diagnosticId": "abc",
  "computedAt": "2026-05-14T18:23:00Z",
  "results": [
    { "dimensionCode": "TRL", "averageLikert": 2.75, "irlLevel": 5 },
    { "dimensionCode": "CRL", "averageLikert": 2.00, "irlLevel": 3 }
  ],
  "bottleneck": ["IPRL"],
  "imbalances": [
    { "pair": "TRL_IPRL", "difference": 3, "classification": "CRITICAL" }
  ]
}
```

### Pagination

For list endpoints (eventually `GET /api/v1/diagnostics`):

```json
{
  "items": [
    /* ... */
  ],
  "pageInfo": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 47,
    "totalPages": 3
  }
}
```

Pagination params: `?page=1&pageSize=20`. Default `pageSize` is 20, maximum 100.

## Error responses

### Format: RFC 7807 Problem Details + `code`

Every error response is a JSON document with `Content-Type: application/problem+json`:

```json
{
  "type": "https://api.diagnostico-irl.icesi/errors/questionnaire-incomplete",
  "title": "Cuestionario incompleto",
  "status": 422,
  "code": "QUESTIONNAIRE_INCOMPLETE",
  "detail": "Faltan 3 afirmaciones por responder",
  "instance": "/api/v1/diagnostics/abc/questionnaire",
  "missing": [
    { "dimension": "TRL", "sequences": [3, 7] },
    { "dimension": "FRL", "sequences": [5] }
  ]
}
```

Fields:

| Field         | Meaning                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| `type`        | URI identifying the error type. Stable; safe to reference in code                                              |
| `title`       | Human-readable summary in **Spanish** (user-facing)                                                            |
| `status`      | HTTP status, mirrors the response status                                                                       |
| `code`        | Machine-readable identifier in `SCREAMING_SNAKE_CASE`. **Use this for frontend logic.** Stable across versions |
| `detail`      | Human-readable description in Spanish                                                                          |
| `instance`    | The URI that produced this error                                                                               |
| Custom fields | Domain-specific context (e.g., `missing`, `validationErrors`)                                                  |

### Status code → error category

| Status | Used when                                                                              |
| ------ | -------------------------------------------------------------------------------------- |
| 401    | No JWT, expired JWT, or invalid JWT                                                    |
| 403    | Authenticated but not permitted to access this resource                                |
| 404    | Resource doesn't exist                                                                 |
| 409    | Conflict — the request can't be applied to current state (e.g., resubmit after submit) |
| 422    | Malformed body or path parameter (class-validator DTO), or a domain invariant violated |
| 503    | An upstream service we depend on is unavailable (InnLab Core)                          |

The mapping of domain errors to HTTP status lives in the exception filters of `apps/api/src/shared/kernel/infrastructure/http/`; each endpoint lists its statuses in Swagger (`ApiErrors(...)`). A validation failure answers 422 with the code `VALIDATION_FAILED` and the list of failed fields ([ADR 0006](../architecture/decisions/0006-validation-at-the-http-boundary.md)).

### Error codes are stable

Once an error code is published (used in production or staging), don't rename it. The frontend may switch on it. New codes are additive.

## Authentication

```http
GET /api/v1/diagnostics
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

The global `JwtAuthGuard` validates the Cognito JWT against JWKS keys cached by `jwks-rsa`. No HTTP roundtrip per request. It is an `APP_GUARD`, so every route is protected unless it carries `@Public()`.

A request without a valid token returns:

```json
HTTP/1.1 401 Unauthorized
Content-Type: application/problem+json

{
  "type": "https://api.diagnostico-irl.icesi/errors/unauthorized",
  "title": "No autenticado",
  "status": 401,
  "code": "UNAUTHENTICATED",
  "detail": "Token JWT ausente o inválido"
}
```

A request with a valid token but trying to access another user's resource returns **404, not 403**:

> Returning 404 instead of 403 prevents enumeration of other users' resource IDs. The leak-via-403 vector is small but real, and the cost of returning 404 is nil.

## Correlation IDs

Every request carries an `X-Correlation-Id` header (the frontend's HTTP interceptor generates a `nanoid`; the backend generates one when it is missing). The backend echoes it in:

- Every log line for that request.
- The `correlationId` field of an error response.

This is the single most useful feature for production debugging. Don't skip it.

## OpenAPI / Swagger

The backend generates OpenAPI 3.x from `@nestjs/swagger` decorators on DTOs and controllers. `@fastify/swagger` publishes that document as is and `@fastify/swagger-ui` serves it at `/api/docs` (JSON at `/api/docs/json`). It is mounted in every environment today; hiding it in production is pending.

Conventions:

- Every controller method has `@ApiOperation({ summary, description })` and `@ApiBearerAuth()` unless it is `@Public()`.
- Request bodies are class-validator DTOs in `presentation/controllers/dto/`, with `@ApiProperty()` on each field; response DTOs `implement` the `@innlab/contracts` type they document, so the compiler catches a drift.
- Path parameters go through a DTO too (`DiagnosticIdParam`, `@IsUUID`), never a raw `@Param('id')`.
- Error statuses are declared with `ApiErrors(...)` (`shared/kernel/presentation/api-errors.decorator.ts`).

## Versioning policy

- **Backwards-compatible changes** to `/api/v1/`: add fields, add endpoints, add optional query params. No version bump.
- **Breaking changes**: introduce `/api/v2/`. Old version stays live for a deprecation window of at least one sprint.
- **Internal changes** (renaming a column in the DB) are not API changes. Don't change the API surface to mirror DB refactors.

## Examples — full endpoints

### Process the questionnaire

```http
POST /api/v1/diagnostics/3f1c…/finalize-initial
Authorization: Bearer ...
X-Correlation-Id: V1StGXR8_Z5jdHi6B-myT
Content-Type: application/json

{
  "answers": [
    { "statementId": "1", "value": 4, "justification": "Tenemos un prototipo probado con tres productores." },
    { "statementId": "2", "value": 2, "justification": "..." }
    // ... 48 in total
  ]
}
```

Responses:

- `201 Created` with the computed `MaturityProfileResponse` (calculated synchronously per RF-07).
- `422 VALIDATION_FAILED` if the id is not a UUID or an answer is malformed (DTO).
- `404` if the diagnostic does not exist.
- `409` if the diagnostic is not at the step that accepts the questionnaire (the initiative is missing, or it is already processed).
- `422` if there are not exactly 48 answers or a justification is blank (domain invariant); nothing is stored.

### Retrieve the profile of an existing diagnostic

```http
GET /api/v1/diagnostics/abc-123/profile
Authorization: Bearer ...
```

Responses:

- `200 OK` with the `MaturityProfileResponse`.
- `404` if the diagnostic doesn't exist or doesn't belong to the caller.
- `409 PROFILE_NOT_YET_COMPUTED` if the diagnostic exists but the questionnaire hasn't been submitted.
