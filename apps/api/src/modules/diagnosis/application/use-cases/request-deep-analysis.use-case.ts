import type { EventPublisher } from '../../../../shared/kernel/application/ports/event-publisher.port.js';
import type { AcceptDeepAnalysisResponse } from '@innlab/contracts';
import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import type { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import { findOwnDiagnosis } from './find-own-diagnosis.js';
import { DeepAnalysisRequestedEvent } from '../../../../shared/kernel/events/deep-analysis-requested.event.js';

export interface RequestDeepAnalysisCommand {
  diagnosticId: string;
  /** The caller: someone else's diagnostic is answered as missing. */
  userId: string;
}

const ALREADY_ACCEPTED_STATES = new Set([
  'DEEP_ANALYSIS_IN_PROGRESS',
  'DEEP_ANALYSIS_COMPLETE',
]);

/**
 * `RequestDeepAnalysisUseCase` (RF-11 / HU-xx).
 *
 * The trigger for `DeepAnalysisRequestedEvent`: the moment the user, already with a
 * computed maturity profile, asks to see the portfolio recommendation
 * and the scaling roadmap. Deliberately a separate action from
 * finishing the questionnaire — `FinalizeInitialDiagnosisUseCase`
 * computes the profile but never requests deep analysis on the user's
 * behalf.
 *
 * Idempotent in state, not in effect: a diagnostic already in
 * `DEEP_ANALYSIS_IN_PROGRESS` or `DEEP_ANALYSIS_COMPLETE` is not
 * transitioned or saved again, but the event is published again. The
 * listeners' calculations are idempotent (`routing/` replaces its
 * recommendation, `roadmap/` persists nothing), and re-publishing is the
 * only way a calculation that failed the first time — e.g. no active
 * routing configuration yet — can ever be retried; a silent no-op would
 * leave the diagnostic stuck in progress with nothing to show.
 *
 * The state transition is saved *before* the event is published — the
 * event fires only once the transition it represents has committed.
 */
export class RequestDeepAnalysisUseCase {
  constructor(
    private readonly diagnostics: DiagnosisRepositoryPort,
    private readonly events: EventPublisher,
  ) {}

  async execute(
    cmd: RequestDeepAnalysisCommand,
  ): Promise<
    Result<AcceptDeepAnalysisResponse, NotFoundError | ConflictError>
  > {
    const own = await findOwnDiagnosis(this.diagnostics, cmd.diagnosticId, cmd.userId);
    if (!own.ok) return own;
    const diagnosis = own.value;

    const current = diagnosis.state.value;
    if (!ALREADY_ACCEPTED_STATES.has(current)) {
      if (current !== 'PROFILE_GENERATED') {
        return Result.err(
          new ConflictError(
            `Deep analysis cannot be requested from state ${current}`,
            {
              diagnosticId: cmd.diagnosticId,
              state: current,
            },
          ),
        );
      }

      diagnosis.transitionTo('DEEP_ANALYSIS_IN_PROGRESS');
      await this.diagnostics.save(diagnosis);
    }

    await this.events.publish(
      new DeepAnalysisRequestedEvent({ diagnosticId: diagnosis.id.value }),
    );

    return Result.ok({
      diagnosticId: diagnosis.id.value,
      state: diagnosis.state.value,
    });
  }
}
