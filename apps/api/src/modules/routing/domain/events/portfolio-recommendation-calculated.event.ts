import { DomainEvent } from '../../../../shared/kernel/events/domain-event.base.js';

/**
 * Fired by `routing/` when it finishes calculating and persisting a
 * portfolio recommendation. No listener yet — exists so `reporting/`
 * can hook into it the day that module is built, without `routing/`
 * needing to know `reporting/` exists (`convenciones-objetivo.md` §1.1).
 *
 * Lives here, not in `shared/kernel/events/`: no module listens to it
 * today, and the location rule reserves that folder for events that do
 * ("regla de ubicación" — an event that starts internal and later gains
 * an external listener moves at that point, not preemptively).
 */
export interface PortfolioRecommendationCalculatedPayload {
  readonly diagnosticId: string;
}

export class PortfolioRecommendationCalculatedEvent extends DomainEvent<PortfolioRecommendationCalculatedPayload> {
  static readonly eventName = 'portfolio-recommendation.calculated';
  readonly name = PortfolioRecommendationCalculatedEvent.eventName;
}
