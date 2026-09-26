import type { Diagnostic } from '@innlab/contracts';
import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import { toDiagnosticResponse } from '../dtos/map-diagnostic-response.js';
import type { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import { findOwnDiagnosis } from './find-own-diagnosis.js';
import { type TaxonomyRepositoryPort } from '../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import { frameworkVersionCodes } from './framework-version-codes.js';

export interface GetDiagnosisQuery {
  diagnosticId: string;
  userId: string;
}

/**
 * One diagnostic of the caller, with whether the deep analysis was accepted.
 *
 * A diagnostic that belongs to someone else is answered as not found, the
 * same as one that does not exist, so its id does not leak.
 */
export class GetDiagnosisUseCase {
  constructor(
    private readonly diagnostics: DiagnosisRepositoryPort,
    private readonly taxonomy: TaxonomyRepositoryPort,
  ) {}

  async execute(
    query: GetDiagnosisQuery,
  ): Promise<Result<Diagnostic, NotFoundError>> {
    const own = await findOwnDiagnosis(this.diagnostics, query.diagnosticId, query.userId);
    if (!own.ok) return own;
    const codes = await frameworkVersionCodes(this.taxonomy, [own.value.frameworkVersionId]);
    return Result.ok(
      toDiagnosticResponse(own.value, codes.get(own.value.frameworkVersionId) ?? ''),
    );
  }
}
