import { DomainEvent } from './domain-event.base.js';

/**
 * Fired by `roadmap/` when it finishes calculating a scaling roadmap.
 * No listener yet — exists so `reporting/` can hook into it the day
 * that module is built, without `roadmap/` needing to know `reporting/`
 * exists.
 *
 * Lives in `shared/kernel/events/` even though nothing listens to it yet:
 * `reporting/` is its intended listener, and it must be able to import the
 * event without depending on `roadmap/` (events meant to cross a module boundary are
 * declared here from the start).
 */
export interface ScalingRoadmapCalculatedPayload {
  readonly diagnosticId: string;
}

export class ScalingRoadmapCalculatedEvent extends DomainEvent<ScalingRoadmapCalculatedPayload> {
  static readonly eventName = 'scaling-roadmap.calculated';
  readonly name = ScalingRoadmapCalculatedEvent.eventName;
}
