import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PortfolioRecommendationCalculatedEvent } from '../../../../shared/kernel/events/portfolio-recommendation-calculated.event.js';
import { ScalingRoadmapCalculatedEvent } from '../../../../shared/kernel/events/scaling-roadmap-calculated.event.js';
import type { DeepAnalysisResult } from '../../domain/entities/diagnosis.aggregate.js';
import { RecordDeepAnalysisResultUseCase } from '../../application/use-cases/record-deep-analysis-result.use-case.js';

/**
 * Hears the two "calculated" events of the deep analysis and records them
 * on the diagnostic, which completes it once both arrived. A `Result.err`
 * is logged and swallowed: the result is already saved by its module.
 */
@Injectable()
export class DeepAnalysisResultListener {
  private readonly logger = new Logger(DeepAnalysisResultListener.name);

  constructor(private readonly record: RecordDeepAnalysisResultUseCase) {}

  @OnEvent(PortfolioRecommendationCalculatedEvent.eventName)
  async onRecommendation(event: PortfolioRecommendationCalculatedEvent): Promise<void> {
    await this.handle(event.payload.diagnosticId, 'recommendation');
  }

  @OnEvent(ScalingRoadmapCalculatedEvent.eventName)
  async onRoadmap(event: ScalingRoadmapCalculatedEvent): Promise<void> {
    await this.handle(event.payload.diagnosticId, 'roadmap');
  }

  private async handle(diagnosticId: string, result: DeepAnalysisResult): Promise<void> {
    const outcome = await this.record.execute({ diagnosticId, result });
    if (!outcome.ok) {
      this.logger.warn(
        `Could not record the ${result} of diagnostic ${diagnosticId}: ${outcome.error.code}`,
      );
    }
  }
}
