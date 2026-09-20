import { Inject, Injectable } from '@nestjs/common';
import type { Diagnostic } from '@innlab/contracts';
import {
  DIAGNOSIS_REPOSITORY,
  type DiagnosisRepositoryPort,
} from '../../domain/repositories/diagnosis.repository.port.js';
import { toDiagnosticResponse } from '../dtos/map-diagnostic-response.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

export interface GetDiagnosisQuery {
  diagnosticId: string;
  userId: string;
}

/**
 * One diagnostic of the caller, with whether the deep analysis was accepted.
 *
 * A diagnostic that belongs to someone else is answered as not found, the
 * same as one that does not exist, so its id does not leak (backlog 14.2).
 */
@Injectable()
export class GetDiagnosisUseCase {
  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnostics: DiagnosisRepositoryPort,
  ) {}

  async execute(query: GetDiagnosisQuery): Promise<Result<Diagnostic, NotFoundError>> {
    const diagnosis = await this.diagnostics.findById(query.diagnosticId);
    if (diagnosis?.userId !== query.userId) {
      return Result.err(new NotFoundError('Diagnosis', query.diagnosticId));
    }
    return Result.ok(toDiagnosticResponse(diagnosis));
  }
}
