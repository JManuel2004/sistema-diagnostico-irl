import { DomainEvent } from './domain-event.base.js';

/**
 * Fired by `diagnosis/` once both results of the deep analysis are saved
 * and the diagnostic has just moved to `DEEP_ANALYSIS_COMPLETE`.
 *
 * `reporting/` listens to send the full report to INNLAB. Publishing it
 * here, after the transition is stored, means the report already exists.
 * A retried calculation does not fire it again: the diagnostic was
 * already complete.
 */
export interface DeepAnalysisCompletedPayload {
  readonly diagnosticId: string;
}

export class DeepAnalysisCompletedEvent extends DomainEvent<DeepAnalysisCompletedPayload> {
  static readonly eventName = 'deep-analysis.completed';
  readonly name = DeepAnalysisCompletedEvent.eventName;
}
