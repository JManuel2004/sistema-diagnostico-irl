import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

export interface ApplyInitiativeToDiagnosisCommand {
  diagnosticId: string;
}

/**
 * Reaction to `InitiativeRegisteredEvent` (RF-04): moves the diagnostic from
 * `WITH_CONSENT` to `WITH_INITIATIVE`. Registering the initiative again
 * (editing it) leaves a diagnostic that is already further along untouched.
 */
export class ApplyInitiativeToDiagnosisUseCase {
  constructor(private readonly diagnostics: DiagnosisRepositoryPort) {}

  async execute(
    cmd: ApplyInitiativeToDiagnosisCommand,
  ): Promise<Result<void, NotFoundError>> {
    const diagnosis = await this.diagnostics.findById(cmd.diagnosticId);
    if (!diagnosis) {
      return Result.err(new NotFoundError('Diagnosis', cmd.diagnosticId));
    }

    if (diagnosis.state.value === 'WITH_CONSENT') {
      diagnosis.transitionTo('WITH_INITIATIVE');
      await this.diagnostics.save(diagnosis);
    }

    return Result.ok(undefined);
  }
}
