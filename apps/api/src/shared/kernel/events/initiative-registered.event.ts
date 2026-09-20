import { DomainEvent } from './domain-event.base.js';

export interface InitiativeRegisteredPayload {
  readonly diagnosticId: string;
}

/**
 * The initiative profile of a diagnostic was registered (RF-04).
 *
 * Published by `initiative/` and heard by `diagnosis/`, which moves the
 * diagnostic on to `WITH_INITIATIVE` (backlog 14.1). It lives here because a
 * module other than the publisher listens to it.
 */
export class InitiativeRegisteredEvent extends DomainEvent<InitiativeRegisteredPayload> {
  static readonly eventName = 'initiative.registered';
  readonly name = InitiativeRegisteredEvent.eventName;
}
