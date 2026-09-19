import { DomainEvent } from './domain-event.base.js';

/**
 * Fired by `diagnosis/` when the user, already with a computed maturity
 * profile, **accepts** receiving the portfolio recommendation and the
 * scaling roadmap — not when the questionnaire completes, a distinct,
 * earlier moment of the flow (`convenciones-objetivo.md` §1.1).
 *
 * Replaces a hand-built "phase 2 orchestrator": `diagnosis/` does not
 * call `routing/` or `roadmap/` directly. Both listen independently and
 * start their own calculation — neither knows the other is listening
 * too.
 *
 * Lives here, not in `diagnosis/domain/events/`, because two other
 * modules listen to it (`convenciones-objetivo.md` §1.1, "regla de
 * ubicación").
 */
export interface DeepAnalysisRequestedPayload {
  readonly diagnosticId: string;
}

export class DeepAnalysisRequestedEvent extends DomainEvent<DeepAnalysisRequestedPayload> {
  static readonly eventName = 'deep-analysis.requested';
  readonly name = DeepAnalysisRequestedEvent.eventName;
}
