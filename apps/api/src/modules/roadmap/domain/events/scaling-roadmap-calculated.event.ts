import { DomainEvent } from '../../../../shared/kernel/events/domain-event.base.js';

/**
 * Fired by `roadmap/` when it finishes calculating a scaling roadmap.
 * No listener yet — exists so `reporting/` can hook into it the day
 * that module is built, without `roadmap/` needing to know `reporting/`
 * exists (`convenciones-objetivo.md` §1.1).
 *
 * Lives here, not in `shared/kernel/events/`: no module listens to it
 * today, and the location rule reserves that folder for events that do
 * ("regla de ubicación" — an event that starts internal and later gains
 * an external listener moves at that point, not preemptively).
 */
export interface ScalingRoadmapCalculatedPayload {
  readonly diagnosticId: string;
}

export class ScalingRoadmapCalculatedEvent extends DomainEvent<ScalingRoadmapCalculatedPayload> {
  static readonly eventName = 'scaling-roadmap.calculated';
  readonly name = ScalingRoadmapCalculatedEvent.eventName;
}
