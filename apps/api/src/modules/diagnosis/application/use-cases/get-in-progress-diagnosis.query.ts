import type { Diagnostic } from '@innlab/contracts';
import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import { type TaxonomyRepositoryPort } from '../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import { toDiagnosticResponse } from '../dtos/map-diagnostic-response.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import { frameworkVersionCodes } from './framework-version-codes.js';

/**
 * The caller's diagnostic still being filled in (no maturity profile yet),
 * the most recently started one; `NotFoundError` when there is none.
 *
 * Its draft is saved on the server, so the panel offers to continue it from
 * any session or device.
 */
export class GetInProgressDiagnosisQuery {
  constructor(
    private readonly diagnoses: DiagnosisRepositoryPort,
    private readonly taxonomy: TaxonomyRepositoryPort,
  ) {}

  async execute(userId: string): Promise<Result<Diagnostic, NotFoundError>> {
    const inProgress = (await this.diagnoses.findAllByUserId(userId))
      .filter((d) => !d.completed)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .at(0);
    if (!inProgress) {
      return Result.err(new NotFoundError('Diagnosis in progress', userId));
    }
    const codes = await frameworkVersionCodes(this.taxonomy, [
      inProgress.frameworkVersionId,
    ]);
    return Result.ok(
      toDiagnosticResponse(
        inProgress,
        codes.get(inProgress.frameworkVersionId) ?? '',
      ),
    );
  }
}
