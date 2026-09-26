import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

export interface ApplyInitiativeToDiagnosisCommand {
  diagnosticId: string;
}

/**
 * Reaction to `InitiativeRegisteredEvent` (RF-04): the diagnostic has the
 * profile of an initiative whose consent is accepted, so it moves on to
 * `WITH_INITIATIVE`, through `WITH_CONSENT` when it is still `STARTED`
 * (the consent belongs to the initiative and may predate the diagnostic).
 * Registering the profile again leaves a diagnostic that is already
 * further along untouched.
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

    const state = diagnosis.state.value;
    if (state === 'STARTED' || state === 'WITH_CONSENT') {
      if (state === 'STARTED') diagnosis.transitionTo('WITH_CONSENT');
      diagnosis.transitionTo('WITH_INITIATIVE');
      await this.diagnostics.save(diagnosis);
    }

    return Result.ok(undefined);
  }
}
