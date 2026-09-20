import { Inject, Injectable } from '@nestjs/common';
import {
  DIAGNOSIS_REPOSITORY,
  type DiagnosisRepositoryPort,
} from '../../domain/repositories/diagnosis.repository.port.js';
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
@Injectable()
export class ApplyInitiativeToDiagnosisUseCase {
  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnostics: DiagnosisRepositoryPort,
  ) {}

  async execute(cmd: ApplyInitiativeToDiagnosisCommand): Promise<Result<void, NotFoundError>> {
    const diagnostico = await this.diagnostics.findById(cmd.diagnosticId);
    if (!diagnostico) {
      return Result.err(new NotFoundError('Diagnosis', cmd.diagnosticId));
    }

    if (diagnostico.state.value === 'WITH_CONSENT') {
      diagnostico.transitionTo('WITH_INITIATIVE');
      await this.diagnostics.save(diagnostico);
    }

    return Result.ok(undefined);
  }
}
