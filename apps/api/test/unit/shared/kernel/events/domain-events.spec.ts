import { DeepAnalysisRequestedEvent } from '../../../../../src/shared/kernel/events/deep-analysis-requested.event.js';
import { PortfolioRecommendationCalculatedEvent } from '../../../../../src/shared/kernel/events/portfolio-recommendation-calculated.event.js';
import { ScalingRoadmapCalculatedEvent } from '../../../../../src/shared/kernel/events/scaling-roadmap-calculated.event.js';

describe('domain events', () => {
  it.each([
    [DeepAnalysisRequestedEvent, 'deep-analysis.requested'],
    [PortfolioRecommendationCalculatedEvent, 'portfolio-recommendation.calculated'],
    [ScalingRoadmapCalculatedEvent, 'scaling-roadmap.calculated'],
  ] as const)('%p carries its stable name, payload and timestamp', (EventClass, name) => {
    const before = Date.now();
    const event = new EventClass({ diagnosticId: 'abc' });

    expect(EventClass.eventName).toBe(name);
    expect(event.name).toBe(name);
    expect(event.payload).toEqual({ diagnosticId: 'abc' });
    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
