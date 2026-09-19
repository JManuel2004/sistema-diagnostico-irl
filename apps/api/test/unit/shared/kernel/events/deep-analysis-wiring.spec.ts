import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { DeepAnalysisRequestedEvent } from '../../../../../src/shared/kernel/events/deep-analysis-requested.event.js';
import { DeepAnalysisRequestedListener as RoutingListener } from '../../../../../src/modules/routing/infrastructure/messaging/deep-analysis-requested.listener.js';
import { DeepAnalysisRequestedListener as RoadmapListener } from '../../../../../src/modules/roadmap/infrastructure/messaging/deep-analysis-requested.listener.js';
import { GenerateRecommendationUseCase } from '../../../../../src/modules/routing/application/use-cases/generate-recommendation.use-case.js';
import { GenerateScalingRoadmapUseCase } from '../../../../../src/modules/roadmap/application/use-cases/generate-scaling-roadmap.use-case.js';
import { NoActiveConfigurationError } from '../../../../../src/modules/routing/domain/exceptions/routing.errors.js';
import { Result } from '../../../../../src/shared/kernel/domain/result.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

/**
 * Verifies the real `@OnEvent` wiring through `EventEmitter2`, not just
 * each listener in isolation: one published event reaches both modules'
 * listeners independently, and one side's business-outcome failure does
 * not stop the other.
 */
describe('DeepAnalysisRequestedEvent wiring', () => {
  it('reaches routing/ and roadmap/ independently, even when routing/ fails', async () => {
    const generateRecommendation = jest.fn(() =>
      Promise.resolve(Result.err(new NoActiveConfigurationError())),
    );
    const generateRoadmap = jest.fn(() => Promise.resolve(Result.ok({})));

    const moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        RoutingListener,
        RoadmapListener,
        {
          provide: GenerateRecommendationUseCase,
          useValue: { execute: generateRecommendation },
        },
        {
          provide: GenerateScalingRoadmapUseCase,
          useValue: { execute: generateRoadmap },
        },
      ],
    }).compile();
    await moduleRef.init();

    await moduleRef
      .get(EventEmitter2)
      .emitAsync(
        DeepAnalysisRequestedEvent.eventName,
        new DeepAnalysisRequestedEvent({ diagnosticId: DIAGNOSTIC_ID }),
      );

    expect(generateRecommendation).toHaveBeenCalledWith({
      diagnosticId: DIAGNOSTIC_ID,
    });
    expect(generateRoadmap).toHaveBeenCalledWith({ diagnosticId: DIAGNOSTIC_ID });

    await moduleRef.close();
  });
});
