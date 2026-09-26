# identity

## Scope
Anticorruption layer towards INNLAB Core and the shared Cognito pool: it authenticates the request (JWT), exposes who the user is (`@CurrentUser()`) and resolves their context (company, role) from Core. **It is not a SEMI domain of its own**: the Core integration is external (`innlab-core-http.client.ts` says so in its header).

## Rules that must hold
- **There is no login, password hashing or session here**: Cognito authenticates; this module only validates the token against the pool's JWKS.
- The JWT carries no company, role or workspace: those are read from Core through `UserContextPort`, never inferred from the token.
- Core is called with the service credential (the static `x-internal-key` header, `CORE_INTERNAL_KEY`), never with the user's JWT (RNF-05); tokens are never stored in the database.
- `JwtAuthGuard` is global (`APP_GUARD`): every route requires a token except those marked `@Public()`.
- The decorators and the guard live in `presentation/` (they are HTTP); the `AuthenticatedUser` type is published through `application/dtos/` so other modules do not import identity's domain.

## Completeness
Implemented: JWT validation (HU-01), user context with an in-memory cache (HU-02). No persistence of its own.

## Responsibility (ubiquitous language)
"Who is using the system and which company they belong to".

## Domain concepts
`AuthenticatedUser`, `UserContext`.

## What it exposes
`@CurrentUser()`, `@Public()`, `JwtAuthGuard`, the `AuthenticatedUser` type, `ResolveUserContextUseCase`. HTTP: `GET me/context`.

## What it depends on
INNLAB Core (HTTP, external integration) and Cognito's JWKS.

## Data it owns
No tables. An in-memory cache of the user context.

## Test coverage
- **Unit:** JWT strategy, guard, Core client, cache, use case.
- **E2E:** `cognito-jwt-guard`; every other e2e suite goes through real authentication with a signed JWT and a mocked JWKS.
