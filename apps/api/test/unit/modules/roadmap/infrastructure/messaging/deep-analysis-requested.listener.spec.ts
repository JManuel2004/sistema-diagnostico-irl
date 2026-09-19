import { jest } from '@jest/globals';
import { DeepAnalysisRequestedListener } from '../../../../../../src/modules/roadmap/infrastructure/messaging/deep-analysis-requested.listener.js';
import type { GenerateScalingRoadmapUseCase } from '../../../../../../src/modules/roadmap/application/use-cases/generate-scaling-roadmap.use-case.js';
import { DeepAnalysisRequestedEvent } from '../../../../../../src/shared/kernel/events/deep-analysis-requested.event.js';
import { ConflictError } from '../../../../../../src/shared/kernel/domain/errors/conflict.error.js';
import { Result } from '../../../../../../src/shared/kernel/domain/result.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('roadmap DeepAnalysisRequestedListener', () => {
  let execute: jest.Mock<GenerateScalingRoadmapUseCase['execute']>;
  let listener: DeepAnalysisRequestedListener;
  const event = new DeepAnalysisRequestedEvent({ diagnosticId: DIAGNOSTIC_ID });

  beforeEach(() => {
    execute = jest.fn();
    listener = new DeepAnalysisRequestedListener({
      execute,
    } as unknown as GenerateScalingRoadmapUseCase);
  });

  it('starts its own calculation for the diagnostic in the event', async () => {
    execute.mockResolvedValueOnce(Result.ok({} as never));

    await listener.handle(event);

    expect(execute).toHaveBeenCalledWith({ diagnosticId: DIAGNOSTIC_ID });
  });

  it('swallows a business-outcome Result.err instead of throwing', async () => {
    execute.mockResolvedValueOnce(
      Result.err(new ConflictError('PROFILE_NOT_YET_COMPUTED')),
    );

    await expect(listener.handle(event)).resolves.toBeUndefined();
  });
});
