import { jest } from '@jest/globals';
import { ConsentRecordedListener } from '../../../../../../src/modules/diagnosis/infrastructure/messaging/consent-recorded.listener.js';
import type { ApplyConsentToDiagnosisUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/apply-consent-to-diagnosis.use-case.js';
import { ConsentRecordedEvent } from '../../../../../../src/shared/kernel/events/consent-recorded.event.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../../../src/shared/kernel/domain/result.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('diagnosis ConsentRecordedListener', () => {
  let execute: jest.Mock<ApplyConsentToDiagnosisUseCase['execute']>;
  let listener: ConsentRecordedListener;
  const event = new ConsentRecordedEvent({ diagnosticId: DIAGNOSTIC_ID });

  beforeEach(() => {
    execute = jest.fn();
    listener = new ConsentRecordedListener({
      execute,
    } as unknown as ApplyConsentToDiagnosisUseCase);
  });

  it('applies the consent to the diagnostic named in the event', async () => {
    execute.mockResolvedValueOnce(Result.ok(undefined));

    await listener.handle(event);

    expect(execute).toHaveBeenCalledWith({ diagnosticId: DIAGNOSTIC_ID });
  });

  it('swallows a business-outcome Result.err instead of throwing', async () => {
    execute.mockResolvedValueOnce(
      Result.err(new NotFoundError('Diagnosis', DIAGNOSTIC_ID)),
    );

    await expect(listener.handle(event)).resolves.toBeUndefined();
  });
});
