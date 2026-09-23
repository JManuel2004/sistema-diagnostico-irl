import type { ConsentRecord } from '@innlab/contracts';
import { type ConsentRepositoryPort } from '../../domain/repositories/consent.repository.port.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

/**
 * `GetConsentUseCase`. Per `consentRecordSchema` in `@innlab/contracts`,
 * "no consent yet" is a 404, not an empty/null body — the frontend uses
 * that to decide whether to show the terms screen. It is a normal,
 * expected outcome, not an exceptional condition.
 */
export class GetConsentUseCase {
  constructor(private readonly consents: ConsentRepositoryPort) {}

  async execute(
    diagnosticId: string,
  ): Promise<Result<ConsentRecord, NotFoundError>> {
    const consent = await this.consents.findByDiagnosticId(diagnosticId);
    if (!consent) {
      return Result.err(new NotFoundError('Consent', diagnosticId));
    }

    return Result.ok({
      diagnosticId: consent.diagnosticId.value,
      version: consent.termsVersion,
      acceptedAt: consent.acceptedAt.toISOString(),
    });
  }
}
