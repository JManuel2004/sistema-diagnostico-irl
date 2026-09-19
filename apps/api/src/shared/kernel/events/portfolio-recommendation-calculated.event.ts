import { DomainEvent } from './domain-event.base.js';

/**
 * Fired by `routing/` when it finishes calculating and persisting a
 * portfolio recommendation. No listener yet — exists so `reporting/`
 * can hook into it the day that module is built, without `routing/`
 * needing to know `reporting/` exists (`convenciones-objetivo.md` §1.1).
 *
 * Lives in `shared/kernel/events/` even though nothing listens to it yet:
 * `reporting/` is its intended listener, and it must be able to import the
 * event without depending on `routing/` (`convenciones-objetivo.md` §1.1,
 * "regla de ubicación" — events meant to cross a module boundary are
 * declared here from the start).
 */
export interface PortfolioRecommendationCalculatedPayload {
  readonly diagnosticId: string;
}

export class PortfolioRecommendationCalculatedEvent extends DomainEvent<PortfolioRecommendationCalculatedPayload> {
  static readonly eventName = 'portfolio-recommendation.calculated';
  readonly name = PortfolioRecommendationCalculatedEvent.eventName;
}
