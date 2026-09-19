# API Design

REST conventions for the `@innlab/api` backend. These rules apply to every endpoint under `/api/v1/`.

## Foundational rules

1. **REST, not RPC.** URLs are resources, not actions.
2. **Versioned at the path.** Every endpoint is prefixed `/api/v1/`. When a breaking change is unavoidable, add `/api/v2/` — never break `/api/v1/`.
3. **English for URL segments**, like every other identifier in the code (`convenciones-objetivo.md` §3). Only user-facing strings stay in Spanish.
4. **camelCase for JSON keys.** Frontend convention.
5. **RFC 7807 Problem Details for all errors.** With a project-specific `code` field for machine consumption.
6. **Authenticated by default.** Every endpoint requires a valid JWT unless explicitly opted out (`@Public()` decorator).
7. **Authorize at the resource level.** Use cases verify that the resource exists and belongs to the caller before acting, and answer `NotFoundError` / `ForbiddenError` (see `initiative/`'s `DiagnosticOwnershipPort`).

## URL conventions

### Resources are plural nouns in English

```
GET    /api/v1/diagnostics                   ✓
GET    /api/v1/diagnostics                  ✗ (Spanish)
GET    /api/v1/diagnostic                    ✗ (singular)

GET    /api/v1/catalog/questionnaire         ✓
GET    /api/v1/catalog/questionnaire         ✗
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

Note: `statementId`, not `afirmacionId`. JSON keys are in English camelCase even though URL segments are Spanish. The justification: frontend code reads these keys, and `data.statementId` reads naturally; mixing Spanish keys with English variable names inside React components creates friction.

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
| 400    | Request didn't pass validation (class-validator or Zod)                                |
| 401    | No JWT, expired JWT, or invalid JWT                                                    |
| 403    | Authenticated but not permitted to access this resource                                |
| 404    | Resource doesn't exist                                                                 |
| 409    | Conflict — the request can't be applied to current state (e.g., resubmit after submit) |
| 422    | Domain invariant violated (questionnaire incomplete, etc.)                             |
| 503    | An upstream service we depend on is unavailable (InnLab Core)                          |

The full mapping of domain errors → HTTP status is in [`apps/api/docs/error-codes.md`](../../apps/api/docs/error-codes.md).

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

Every request must carry an `X-Correlation-Id` header (frontend generates a `nanoid`). The backend echoes it in:

- Every log line for that request.
- The error response body when `instance` is set.
- The `X-Correlation-Id` response header.

This is the single most useful feature for production debugging. Don't skip it.

## OpenAPI / Swagger

The backend generates OpenAPI 3.x from `@nestjs/swagger` decorators on DTOs and controllers. Available at `/api/v1/docs` in non-production environments only — never expose in production (it leaks the API surface).

Conventions:

- Every controller method has `@ApiOperation({ summary, description })`.
- Every DTO has `@ApiProperty()` decorators on fields with examples.
- Every error response is documented with `@ApiResponse({ status, schema: problemDetailsSchema })`.

## Versioning policy

- **Backwards-compatible changes** to `/api/v1/`: add fields, add endpoints, add optional query params. No version bump.
- **Breaking changes**: introduce `/api/v2/`. Old version stays live for a deprecation window of at least one sprint.
- **Internal changes** (renaming `id_respuesta` in the DB) are not API changes. Don't change the API surface to mirror DB refactors.

## Examples — full endpoints

### Submit the questionnaire

```http
POST /api/v1/diagnostics/abc-123/questionnaire
Authorization: Bearer ...
X-Correlation-Id: V1StGXR8_Z5jdHi6B-myT
Content-Type: application/json

{
  "answers": [
    { "statementId": "...", "value": 4 },
    { "statementId": "...", "value": 2 }
    // ... 46 more, 48 total
  ]
}
```

Responses:

- `200 OK` with the computed `MaturityProfileResponse` body (calculated synchronously per RF-07; this is a small enough computation).
- `400` if any answer is malformed.
- `404` if the diagnostic doesn't belong to the caller (see above).
- `409` if the diagnostic is already past the questionnaire phase.
- `422 QUESTIONNAIRE_INCOMPLETE` if fewer than 48 answers, with the `missing` array.

### Retrieve the profile of an existing diagnostic

```http
GET /api/v1/diagnostics/abc-123/profile
Authorization: Bearer ...
```

Responses:

- `200 OK` with the `MaturityProfileResponse`.
- `404` if the diagnostic doesn't exist or doesn't belong to the caller.
- `409 PROFILE_NOT_YET_COMPUTED` if the diagnostic exists but the questionnaire hasn't been submitted.
