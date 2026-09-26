import { DomainEvent } from './domain-event.base.js';

export interface InitiativeRegisteredPayload {
  readonly diagnosticId: string;
}

/**
 * The initiative profile of a diagnostic was registered (RF-04), for an
 * initiative whose consent (RF-03) is accepted at the current version.
 *
 * Published by `initiative/` and heard by `diagnosis/`, which moves the
 * diagnostic on to `WITH_INITIATIVE` (through `WITH_CONSENT`). It lives here
 * because a module other than the publisher listens to it.
 */
export class InitiativeRegisteredEvent extends DomainEvent<InitiativeRegisteredPayload> {
  static readonly eventName = 'initiative.registered';
  readonly name = InitiativeRegisteredEvent.eventName;
}
