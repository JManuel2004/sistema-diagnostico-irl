import { Inject, Injectable } from '@nestjs/common';
import type { ConsentRecord } from '@innlab/contracts';
import {
  CONSENT_REPOSITORY,
  type ConsentRepositoryPort,
} from '../../domain/repositories/consent.repository.port.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';

/**
 * `GetConsentUseCase`. Per `consentRecordSchema` in `@innlab/contracts`,
 * "no consent yet" is a 404, not an empty/null body — the frontend uses
 * that to decide whether to show the terms screen.
 */
@Injectable()
export class GetConsentUseCase {
  constructor(
    @Inject(CONSENT_REPOSITORY)
    private readonly consents: ConsentRepositoryPort,
  ) {}

  async execute(diagnosticId: string): Promise<ConsentRecord> {
    const consent = await this.consents.findByDiagnosticId(diagnosticId);
    if (!consent) {
      throw new NotFoundError('Consent', diagnosticId);
    }

    return {
      diagnosticId: consent.diagnosticId.value,
      version: consent.termsVersion,
      acceptedAt: consent.acceptedAt.toISOString(),
    };
  }
}
