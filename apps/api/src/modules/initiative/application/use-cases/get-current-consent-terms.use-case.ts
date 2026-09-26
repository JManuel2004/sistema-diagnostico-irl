import type { ConsentTerms } from '@innlab/contracts';
import { type ConsentTermsCatalogPort } from '../../domain/repositories/consent-terms.port.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

/**
 * The consent text the user must accept: the latest published version
 * (RF-03). The frontend shows it and sends back its `version`.
 */
export class GetCurrentConsentTermsUseCase {
  constructor(private readonly terms: ConsentTermsCatalogPort) {}

  async execute(): Promise<Result<ConsentTerms, NotFoundError>> {
    const current = await this.terms.findCurrent();
    if (!current) return Result.err(new NotFoundError('Consent terms', 'current'));
    return Result.ok({
      version: current.version,
      title: current.title,
      sections: [...current.sections],
      checkboxLabel: current.checkboxLabel,
      publishedAt: current.publishedAt.toISOString(),
    });
  }
}
