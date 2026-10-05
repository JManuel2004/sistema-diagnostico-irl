import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import type { DeepAnalysisResult } from '../../domain/entities/diagnosis.aggregate.js';
import type { EventPublisher } from '../../../../shared/kernel/application/ports/event-publisher.port.js';
import { DeepAnalysisCompletedEvent } from '../../../../shared/kernel/events/deep-analysis-completed.event.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

export interface RecordDeepAnalysisResultCommand {
  diagnosticId: string;
  result: DeepAnalysisResult;
}

/**
 * Records that `routing/` saved the recommendation or `roadmap/` saved the
 * roadmap; with both, the diagnostic moves to `DEEP_ANALYSIS_COMPLETE`.
 *
 * The two listeners run at the same time, so the change goes through
 * `modify`, which serializes it per diagnostic: neither can overwrite the
 * other's date, and whichever comes second sees both.
 */
export class RecordDeepAnalysisResultUseCase {
  constructor(
    private readonly diagnostics: DiagnosisRepositoryPort,
    private readonly events: EventPublisher,
  ) {}

  async execute(cmd: RecordDeepAnalysisResultCommand): Promise<Result<void, NotFoundError>> {
    let becameComplete = false;
    const diagnosis = await this.diagnostics.modify(cmd.diagnosticId, (d) => {
      const wasComplete = d.deepAnalysisCompleted;
      d.recordDeepAnalysisResult(cmd.result);
      becameComplete = !wasComplete && d.deepAnalysisCompleted;
    });
    if (!diagnosis) {
      return Result.err(new NotFoundError('Diagnosis', cmd.diagnosticId));
    }
    if (becameComplete) {
      await this.events.publish(
        new DeepAnalysisCompletedEvent({ diagnosticId: cmd.diagnosticId }),
      );
    }
    return Result.ok(undefined);
  }
}
