import { DomainEvent } from './domain-event.base.js';

/**
 * Fired by `initiative/` once a user's privacy consent (Law 1581, RF-03)
 * for a diagnostic has been saved.
 *
 * `consent` lives in `initiative/`, but the diagnostic's state machine
 * lives in `diagnosis/` and its first step (`STARTED → WITH_CONSENT`)
 * depends on that consent. `initiative/` does not call `diagnosis/`:
 * `diagnosis/` listens and moves its own state.
 *
 * Published only after the consent is persisted, never before — a
 * listener must be able to rely on the fact having been committed.
 *
 * Lives here, not in `initiative/domain/events/`, because another
 * module listens to it.
 */
export interface ConsentRecordedPayload {
  readonly diagnosticId: string;
}

export class ConsentRecordedEvent extends DomainEvent<ConsentRecordedPayload> {
  static readonly eventName = 'consent.recorded';
  readonly name = ConsentRecordedEvent.eventName;
}
