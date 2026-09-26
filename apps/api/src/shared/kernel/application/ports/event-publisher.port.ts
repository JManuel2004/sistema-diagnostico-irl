import type { DomainEvent } from '../../events/domain-event.base.js';

export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');

/**
 * Publishes a domain event and resolves once every listener has run. Use
 * cases publish through this port, after the transaction that produced the
 * fact has committed, so `application/` never depends on the event bus.
 */
export interface EventPublisher {
  publish(event: DomainEvent<unknown>): Promise<void>;
}
