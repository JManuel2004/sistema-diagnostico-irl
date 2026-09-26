import type { Diagnosis } from '../../domain/entities/diagnosis.aggregate.js';
import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

/**
 * The diagnostic `diagnosticId` when it belongs to `userId` (RNF-04).
 *
 * Someone else's diagnostic is answered exactly like a missing one — a
 * `NotFoundError`, not a `ForbiddenError` — so a user cannot learn whether
 * an id exists.
 */
export async function findOwnDiagnosis(
  diagnoses: DiagnosisRepositoryPort,
  diagnosticId: string,
  userId: string,
): Promise<Result<Diagnosis, NotFoundError>> {
  const diagnosis = await diagnoses.findById(diagnosticId);
  if (diagnosis?.userId !== userId) {
    return Result.err(new NotFoundError('Diagnosis', diagnosticId));
  }
  return Result.ok(diagnosis);
}
