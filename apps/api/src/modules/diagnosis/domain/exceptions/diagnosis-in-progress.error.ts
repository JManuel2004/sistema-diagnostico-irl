import { DomainError } from '../../../../shared/kernel/domain/errors/domain-error.js';

/**
 * A new diagnostic was requested while the user has one still being filled
 * in, without saying to discard it. Starting a new one deletes the
 * unfinished one and its saved draft, so that can only happen once the user
 * chose it.
 *
 * Maps to **409** (`DomainExceptionFilter`, by code).
 */
export class DiagnosisInProgressError extends DomainError {
  override readonly code = 'DIAGNOSIS_IN_PROGRESS';

  constructor(public readonly diagnosticId: string) {
    super(
      'Ya tienes un diagnóstico sin terminar. Continúalo o descártalo para iniciar uno nuevo.',
    );
  }
}
