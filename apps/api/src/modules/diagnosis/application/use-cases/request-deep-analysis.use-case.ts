import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AcceptDeepAnalysisResponse } from '@innlab/contracts';
import {
  DIAGNOSIS_REPOSITORY,
  type DiagnosisRepositoryPort,
} from '../../domain/repositories/diagnosis.repository.port.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import { DeepAnalysisRequestedEvent } from '../../../../shared/kernel/events/deep-analysis-requested.event.js';

export interface RequestDeepAnalysisCommand {
  diagnosticId: string;
}

const ALREADY_ACCEPTED_STATES = new Set([
  'DEEP_ANALYSIS_IN_PROGRESS',
  'DEEP_ANALYSIS_COMPLETE',
]);

/**
 * `RequestDeepAnalysisUseCase` (RF-11 / HU-xx).
 *
 * The trigger for `DeepAnalysisRequestedEvent`
 * (`convenciones-objetivo.md` §1.1): the moment the user, already with a
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
 * event fires only once the transition it represents has committed
 * (`convenciones-objetivo.md` §1.1).
 */
@Injectable()
export class RequestDeepAnalysisUseCase {
  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnostics: DiagnosisRepositoryPort,
    private readonly events: EventEmitter2,
  ) {}

  async execute(
    cmd: RequestDeepAnalysisCommand,
  ): Promise<Result<AcceptDeepAnalysisResponse, NotFoundError | ConflictError>> {
    const diagnostico = await this.diagnostics.findById(cmd.diagnosticId);
    if (!diagnostico) {
      return Result.err(new NotFoundError('Diagnosis', cmd.diagnosticId));
    }

    const current = diagnostico.state.value;
    if (!ALREADY_ACCEPTED_STATES.has(current)) {
      if (current !== 'PROFILE_GENERATED') {
        return Result.err(
          new ConflictError(
            `Deep analysis cannot be requested from state ${current}`,
            { diagnosticId: cmd.diagnosticId, state: current },
          ),
        );
      }

      diagnostico.transitionTo('DEEP_ANALYSIS_IN_PROGRESS');
      await this.diagnostics.save(diagnostico);
    }

    await this.events.emitAsync(
      DeepAnalysisRequestedEvent.eventName,
      new DeepAnalysisRequestedEvent({ diagnosticId: diagnostico.id.value }),
    );

    return Result.ok({
      diagnosticId: diagnostico.id.value,
      state: diagnostico.state.value,
    });
  }
}
