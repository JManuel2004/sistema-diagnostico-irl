/**
 * Base class for domain events published across module boundaries.
 *
 * Dispatched via `@nestjs/event-emitter`'s `EventEmitter2`, synchronously
 * within the same use case that produced the state change, after the
 * transaction that originated the event has committed
 * (`convenciones-objetivo.md` §1.1/§2.2). The project has no queue
 * infrastructure and does not introduce one for this — in-process
 * dispatch is enough for the current volume and topology.
 */
export abstract class DomainEvent<T> {
  abstract readonly name: string;
  readonly occurredAt: Date = new Date();
  constructor(public readonly payload: T) {}
}
