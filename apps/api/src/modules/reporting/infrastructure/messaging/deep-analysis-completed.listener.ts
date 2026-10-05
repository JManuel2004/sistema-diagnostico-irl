import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DeepAnalysisCompletedEvent } from '../../../../shared/kernel/events/deep-analysis-completed.event.js';
import { NotifyInnlabOfCompletedReportUseCase } from '../../application/use-cases/notify-innlab-of-completed-report.use-case.js';

/**
 * Mails the report after the deep analysis is stored. The send is not
 * awaited: a slow or failing server must not hold the request that
 * finished the analysis, and the report stays on screen either way.
 */
@Injectable()
export class DeepAnalysisCompletedListener {
  private readonly logger = new Logger(DeepAnalysisCompletedListener.name);

  constructor(private readonly notify: NotifyInnlabOfCompletedReportUseCase) {}

  @OnEvent(DeepAnalysisCompletedEvent.eventName)
  onCompleted(event: DeepAnalysisCompletedEvent): void {
    void this.notify.execute(event.payload.diagnosticId).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(
        `Could not mail the report of diagnostic ${event.payload.diagnosticId}: ${message}`,
      );
    });
  }
}
