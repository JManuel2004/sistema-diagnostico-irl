import { Injectable } from '@nestjs/common';
import { FindDiagnosisOwnerQuery } from '../../diagnosis/application/use-cases/find-diagnosis-owner.query.js';
import type { DiagnosticOwnershipPort } from '../domain/repositories/diagnostic-ownership.port.js';
import { NotFoundError } from '../../../shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../shared/kernel/domain/result.js';

/**
 * `DiagnosticOwnershipPort` over `diagnosis/`'s exported
 * `FindDiagnosisOwnerQuery`. A missing diagnostic and someone else's are
 * the same answer, so the id of another user's diagnostic is not revealed.
 */
@Injectable()
export class DiagnosisOwnershipAdapter implements DiagnosticOwnershipPort {
  constructor(private readonly findOwner: FindDiagnosisOwnerQuery) {}

  async verify(diagnosticId: string, userId: string): Promise<Result<void, NotFoundError>> {
    const ownerId = await this.findOwner.execute(diagnosticId);
    if (ownerId !== userId) {
      return Result.err(new NotFoundError('Diagnosis', diagnosticId));
    }
    return Result.ok(undefined);
  }
}
