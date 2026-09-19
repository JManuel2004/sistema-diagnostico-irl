import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConsentRecordedEvent } from '../../../../shared/kernel/events/consent-recorded.event.js';
import { ApplyConsentToDiagnosisUseCase } from '../../application/use-cases/apply-consent-to-diagnosis.use-case.js';

/**
 * Translates `ConsentRecordedEvent` (published by `initiative/`) into
 * `diagnosis/`'s own state transition.
 *
 * A `Result.err` is logged and swallowed rather than thrown: the consent
 * is already persisted and the user's request must not fail because the
 * diagnostic could not be advanced.
 */
@Injectable()
export class ConsentRecordedListener {
  private readonly logger = new Logger(ConsentRecordedListener.name);

  constructor(private readonly applyConsent: ApplyConsentToDiagnosisUseCase) {}

  @OnEvent(ConsentRecordedEvent.eventName)
  async handle(event: ConsentRecordedEvent): Promise<void> {
    const result = await this.applyConsent.execute({
      diagnosticId: event.payload.diagnosticId,
    });
    if (!result.ok) {
      this.logger.warn(
        `Could not apply consent to diagnostic ${event.payload.diagnosticId}: ${result.error.code}`,
      );
    }
  }
}
