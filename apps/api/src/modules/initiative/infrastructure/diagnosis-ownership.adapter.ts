import { Inject, Injectable } from '@nestjs/common';
import {
  DIAGNOSIS_REPOSITORY,
  type DiagnosisRepositoryPort,
} from '../../diagnosis/domain/repositories/diagnosis.repository.port.js';
import type { DiagnosticOwnershipPort } from '../domain/repositories/diagnostic-ownership.port.js';
import { NotFoundError } from '../../../shared/kernel/domain/errors/not-found.error.js';
import { ForbiddenError } from '../../../shared/kernel/domain/errors/forbidden.error.js';
import { Result } from '../../../shared/kernel/domain/result.js';
import { Uuid } from '../../../shared/kernel/domain/value-objects/uuid.vo.js';

/**
 * Answers `DiagnosticOwnershipPort` from `diagnosis/`'s exported
 * repository port — a Supporting context reading a Core context's
 * exported port for a read-only query, which the composition rule allows.
 * Only the owner id is read; the entity does not leave this class.
 */
@Injectable()
export class DiagnosisOwnershipAdapter implements DiagnosticOwnershipPort {
  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnostics: DiagnosisRepositoryPort,
  ) {}

  async verify(
    diagnosticId: string,
    userId: string,
  ): Promise<Result<void, NotFoundError | ForbiddenError>> {
    // Rejects a malformed id before it reaches the database.
    const id = Uuid.create(diagnosticId);
    const diagnostic = await this.diagnostics.findById(id.value);

    if (!diagnostic) {
      return Result.err(new NotFoundError('Diagnosis', diagnosticId));
    }
    if (diagnostic.userId !== userId) {
      return Result.err(new ForbiddenError('The diagnostic belongs to another user'));
    }
    return Result.ok(undefined);
  }
}
