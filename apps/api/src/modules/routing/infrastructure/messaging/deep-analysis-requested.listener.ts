import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DeepAnalysisRequestedEvent } from '../../../../shared/kernel/events/deep-analysis-requested.event.js';
import { GenerateRecommendationUseCase } from '../../application/use-cases/generate-recommendation.use-case.js';

/**
 * Translates `DeepAnalysisRequestedEvent` into `routing/`'s own
 * calculation — `convenciones-objetivo.md` §1.1's "regla de
 * composición" case (a): `routing/` reacts to `diagnosis/`'s event
 * instead of `diagnosis/` calling it directly, and does not know
 * `roadmap/` is reacting to the same event too.
 *
 * A `Result.err` here (no active configuration, profile not computed)
 * is a legitimate, already-logged business outcome, not a bug — logged
 * and swallowed rather than thrown, so it neither fails the emitting
 * use case's `emitAsync` nor blocks `roadmap/`'s listener from running.
 * Whoever later requests the recommendation over HTTP gets the same
 * error through the normal `Result` → `DomainExceptionFilter` path.
 */
@Injectable()
export class DeepAnalysisRequestedListener {
  private readonly logger = new Logger(DeepAnalysisRequestedListener.name);

  constructor(private readonly generate: GenerateRecommendationUseCase) {}

  @OnEvent(DeepAnalysisRequestedEvent.eventName)
  async handle(event: DeepAnalysisRequestedEvent): Promise<void> {
    const result = await this.generate.execute({
      diagnosticId: event.payload.diagnosticId,
    });
    if (!result.ok) {
      this.logger.warn(
        `Could not generate recommendation for diagnostic ${event.payload.diagnosticId}: ${result.error.code}`,
      );
    }
  }
}
