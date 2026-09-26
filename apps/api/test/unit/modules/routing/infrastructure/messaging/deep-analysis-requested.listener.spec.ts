import { jest } from '@jest/globals';
import { DeepAnalysisRequestedListener } from '../../../../../../src/modules/routing/infrastructure/messaging/deep-analysis-requested.listener.js';
import type { GenerateRecommendationUseCase } from '../../../../../../src/modules/routing/application/use-cases/generate-recommendation.use-case.js';
import { DeepAnalysisRequestedEvent } from '../../../../../../src/shared/kernel/events/deep-analysis-requested.event.js';
import { RoutingConfigurationMissingError } from '../../../../../../src/modules/routing/domain/exceptions/routing.errors.js';
import { Result } from '../../../../../../src/shared/kernel/domain/result.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('routing DeepAnalysisRequestedListener', () => {
  let execute: jest.Mock<GenerateRecommendationUseCase['execute']>;
  let listener: DeepAnalysisRequestedListener;
  const event = new DeepAnalysisRequestedEvent({ diagnosticId: DIAGNOSTIC_ID });

  beforeEach(() => {
    execute = jest.fn();
    listener = new DeepAnalysisRequestedListener({
      execute,
    } as unknown as GenerateRecommendationUseCase);
  });

  it('starts its own calculation for the diagnostic in the event', async () => {
    execute.mockResolvedValueOnce(Result.ok({} as never));

    await listener.handle(event);

    expect(execute).toHaveBeenCalledWith({ diagnosticId: DIAGNOSTIC_ID });
  });

  it('swallows a business-outcome Result.err instead of throwing', async () => {
    execute.mockResolvedValueOnce(
      Result.err(new RoutingConfigurationMissingError({ diagnosticId: DIAGNOSTIC_ID })),
    );

    await expect(listener.handle(event)).resolves.toBeUndefined();
  });
});
