import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { EventPublisher } from '../../application/ports/event-publisher.port.js';
import type { DomainEvent } from '../../events/domain-event.base.js';

/**
 * `EventPublisher` over `@nestjs/event-emitter`: in-process, synchronous
 * dispatch, keyed by the event's `name`. `emitAsync` waits for the
 * listeners, so a use case's response is sent after they ran.
 */
@Injectable()
export class EventEmitterPublisher implements EventPublisher {
  constructor(private readonly emitter: EventEmitter2) {}

  async publish(event: DomainEvent<unknown>): Promise<void> {
    await this.emitter.emitAsync(event.name, event);
  }
}
