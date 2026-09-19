import { Inject, Injectable } from '@nestjs/common';
import {
  DIAGNOSIS_REPOSITORY,
  type DiagnosisRepositoryPort,
} from '../../domain/repositories/diagnosis.repository.port.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

export interface ApplyConsentToDiagnosisCommand {
  diagnosticId: string;
}

/**
 * `ApplyConsentToDiagnosisUseCase` (RF-03).
 *
 * `diagnosis/`'s reaction to `ConsentRecordedEvent`: moves a freshly
 * started diagnostic from `STARTED` to `WITH_CONSENT`. The consent itself
 * belongs to `initiative/`; only the state transition is `diagnosis/`'s.
 *
 * Idempotent: consent can be recorded again (a client retry, a new terms
 * version), and by then the diagnostic may already be past `STARTED`.
 * Any state other than `STARTED` is left alone and reported as success —
 * the consent is already reflected, or the diagnostic has moved on, and
 * neither is an error. It never moves a diagnostic backwards.
 */
@Injectable()
export class ApplyConsentToDiagnosisUseCase {
  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnostics: DiagnosisRepositoryPort,
  ) {}

  async execute(
    cmd: ApplyConsentToDiagnosisCommand,
  ): Promise<Result<void, NotFoundError>> {
    const diagnostico = await this.diagnostics.findById(cmd.diagnosticId);
    if (!diagnostico) {
      return Result.err(new NotFoundError('Diagnosis', cmd.diagnosticId));
    }

    if (diagnostico.state.value === 'STARTED') {
      diagnostico.transitionTo('WITH_CONSENT');
      await this.diagnostics.save(diagnostico);
    }

    return Result.ok(undefined);
  }
}
