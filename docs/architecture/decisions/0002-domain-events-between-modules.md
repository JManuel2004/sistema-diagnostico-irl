# 0002 — Modules react to each other through in-process domain events

**Status:** accepted

## Context

Accepting the deep analysis must produce a portfolio recommendation and a scaling roadmap; recording the consent and registering the initiative must move the diagnostic's state. A hand-built orchestrator would make `diagnosis` depend on `routing` and `roadmap`, and `initiative` depend on `diagnosis`'s state machine.

## Decision

- The module where a fact happens publishes a domain event **after** the transaction that produced it; the modules that care listen and run their own use case.
- Transport: `@nestjs/event-emitter`, synchronous and in process (`emitAsync` waits for the listeners). No queue: the volume and topology do not need one.
- An event another module listens to — or is declared for another module to listen to — lives in `shared/kernel/events/`, so the listener never imports the publisher. `domain/events/` of a module is only for events nobody else hears.
- Events today: `ConsentRecordedEvent` and `InitiativeRegisteredEvent` (`initiative` → `diagnosis`), `DeepAnalysisRequestedEvent` (`diagnosis` → `routing`, `roadmap`), `PortfolioRecommendationCalculatedEvent` and `ScalingRoadmapCalculatedEvent` (no listener yet; declared for `reporting`).
- Listeners are idempotent and a failing listener is logged without failing the request that published the event.

## Consequences

- `routing` and `roadmap` do not know about each other and never call `diagnosis`'s processes.
- Use cases publish through the `EventPublisher` port ([0005](./0005-framework-free-application-layer.md)).
- `reporting` will listen to the two "calculated" events and, per diagnostic, generate the report once both pieces arrived — two idempotent writes and a presence check, no saga.
