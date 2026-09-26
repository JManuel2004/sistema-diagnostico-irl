import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InitiativeRegisteredEvent } from '../../../../shared/kernel/events/initiative-registered.event.js';
import { ApplyInitiativeToDiagnosisUseCase } from '../../application/use-cases/apply-initiative-to-diagnosis.use-case.js';

/**
 * Translates `InitiativeRegisteredEvent` into the state change `diagnosis/`
 * owns. A `Result.err` is logged and swallowed: the initiative profile is
 * already saved.
 */
@Injectable()
export class InitiativeRegisteredListener {
  private readonly logger = new Logger(InitiativeRegisteredListener.name);

  constructor(private readonly applyInitiative: ApplyInitiativeToDiagnosisUseCase) {}

  @OnEvent(InitiativeRegisteredEvent.eventName)
  async handle(event: InitiativeRegisteredEvent): Promise<void> {
    const result = await this.applyInitiative.execute({
      diagnosticId: event.payload.diagnosticId,
    });
    if (!result.ok) {
      this.logger.warn(
        `Could not apply initiative to diagnostic ${event.payload.diagnosticId}: ${result.error.code}`,
      );
    }
  }
}
