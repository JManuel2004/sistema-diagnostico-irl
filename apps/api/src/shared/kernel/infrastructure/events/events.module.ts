import { Global, Module } from '@nestjs/common';
import { EVENT_PUBLISHER } from '../../application/ports/event-publisher.port.js';
import { EventEmitterPublisher } from './event-emitter.publisher.js';

/** Makes `EVENT_PUBLISHER` available to every module's use cases. */
@Global()
@Module({
  providers: [{ provide: EVENT_PUBLISHER, useClass: EventEmitterPublisher }],
  exports: [EVENT_PUBLISHER],
})
export class EventsModule {}
