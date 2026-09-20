import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { DeepAnalysisRequestedEvent } from '../../../../shared/kernel/events/deep-analysis-requested.event.js';
import { ScalingRoadmapCalculatedEvent } from '../../../../shared/kernel/events/scaling-roadmap-calculated.event.js';
import { GenerateScalingRoadmapUseCase } from '../../application/use-cases/generate-scaling-roadmap.use-case.js';

/**
 * Translates `DeepAnalysisRequestedEvent` into `roadmap/`'s own
 * calculation — `convenciones-objetivo.md` §1.1's "regla de
 * composición" case (a): `roadmap/` reacts to `diagnosis/`'s event
 * instead of `diagnosis/` calling it directly, and does not know
 * `routing/` is reacting to the same event too.
 *
 * A `Result.err` here is a legitimate, already-logged business outcome,
 * not a bug — logged and swallowed rather than thrown, so it neither
 * fails the emitting use case's `emitAsync` nor blocks `routing/`'s
 * listener.
 *
 * On success the use case has already saved the roadmap, and this listener
 * publishes `ScalingRoadmapCalculatedEvent`. Whoever later reads the roadmap
 * over HTTP before a successful calculation gets `ROADMAP_NOT_GENERATED`
 * through the normal `Result` → `DomainExceptionFilter` path.
 */
@Injectable()
export class DeepAnalysisRequestedListener {
  private readonly logger = new Logger(DeepAnalysisRequestedListener.name);

  constructor(
    private readonly generate: GenerateScalingRoadmapUseCase,
    private readonly events: EventEmitter2,
  ) {}

  @OnEvent(DeepAnalysisRequestedEvent.eventName)
  async handle(event: DeepAnalysisRequestedEvent): Promise<void> {
    const result = await this.generate.execute({
      diagnosticId: event.payload.diagnosticId,
    });
    if (!result.ok) {
      this.logger.warn(
        `Could not calculate roadmap for diagnostic ${event.payload.diagnosticId}: ${result.error.code}`,
      );
      return;
    }
    await this.events.emitAsync(
      ScalingRoadmapCalculatedEvent.eventName,
      new ScalingRoadmapCalculatedEvent({
        diagnosticId: event.payload.diagnosticId,
      }),
    );
  }
}
