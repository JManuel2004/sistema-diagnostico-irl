import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
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
export class ApplyConsentToDiagnosisUseCase {
  constructor(private readonly diagnostics: DiagnosisRepositoryPort) {}

  async execute(
    cmd: ApplyConsentToDiagnosisCommand,
  ): Promise<Result<void, NotFoundError>> {
    const diagnosis = await this.diagnostics.findById(cmd.diagnosticId);
    if (!diagnosis) {
      return Result.err(new NotFoundError('Diagnosis', cmd.diagnosticId));
    }

    if (diagnosis.state.value === 'STARTED') {
      diagnosis.transitionTo('WITH_CONSENT');
      await this.diagnostics.save(diagnosis);
    }

    return Result.ok(undefined);
  }
}
