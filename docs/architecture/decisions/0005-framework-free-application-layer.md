# 0005 — `application/` imports no framework: factories and an event port

**Status:** accepted — supersedes the earlier lint exception that allowed Nest's DI decorators in `application/`.

## Context

`domain/` was already framework-free. Use cases in `application/` were Nest providers (`@Injectable()`, `@Inject(TOKEN)`) and published events with Nest's `EventEmitter2`, so the layer that orchestrates the domain depended on the framework and on the event bus.

## Decision

- Use cases and queries are plain classes whose constructors receive ports. Each module binds them with `applicationProvider(UseCase, [TOKEN_A, TOKEN_B, …])` (`shared/kernel/infrastructure/nest/application-provider.ts`), a `useFactory` + `inject` provider that lists the dependencies in constructor order.
- Events are published through the `EventPublisher` port (`shared/kernel/application/ports/event-publisher.port.ts`); `EventEmitterPublisher` implements it over `@nestjs/event-emitter` and the global `EventsModule` provides it as `EVENT_PUBLISHER`.
- ESLint forbids framework and IO packages in `application/`, as it already did in `domain/`.

## Consequences

- Unit tests build use cases with `new` and plain stubs; nothing changes for them.
- A new use case must be added to its module with `applicationProvider(...)`; forgetting a dependency fails at boot, not silently.
