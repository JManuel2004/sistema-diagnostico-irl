import { Injectable } from '@nestjs/common';
import { FindDiagnosisOwnerQuery } from '../../diagnosis/application/use-cases/find-diagnosis-owner.query.js';
import type { DiagnosticOwnershipPort } from '../domain/repositories/diagnostic-ownership.port.js';
import { NotFoundError } from '../../../shared/kernel/domain/errors/not-found.error.js';
import { ForbiddenError } from '../../../shared/kernel/domain/errors/forbidden.error.js';
import { Result } from '../../../shared/kernel/domain/result.js';
import { Uuid } from '../../../shared/kernel/domain/value-objects/uuid.vo.js';

/**
 * Answers `DiagnosticOwnershipPort` with `diagnosis/`'s exported read
 * query — a Supporting context consuming a Core context's read-only data,
 * which the composition rule allows. Only the owner id crosses the
 * boundary.
 */
@Injectable()
export class DiagnosisOwnershipAdapter implements DiagnosticOwnershipPort {
  constructor(private readonly findOwner: FindDiagnosisOwnerQuery) {}

  async verify(
    diagnosticId: string,
    userId: string,
  ): Promise<Result<void, NotFoundError | ForbiddenError>> {
    // Rejects a malformed id before it reaches the database.
    const id = Uuid.create(diagnosticId);
    const ownerId = await this.findOwner.execute(id.value);

    if (ownerId === null) {
      return Result.err(new NotFoundError('Diagnosis', diagnosticId));
    }
    if (ownerId !== userId) {
      return Result.err(
        new ForbiddenError('The diagnostic belongs to another user'),
      );
    }
    return Result.ok(undefined);
  }
}
