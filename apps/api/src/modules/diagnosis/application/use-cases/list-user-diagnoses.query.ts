import type { DiagnosticSummary } from '@innlab/contracts';
import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import { toDiagnosticResponse } from '../dtos/map-diagnostic-response.js';
import { type TaxonomyRepositoryPort } from '../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import { frameworkVersionCodes } from './framework-version-codes.js';

/**
 * The diagnostics of one user, most recent first, as the contract's
 * summaries. Exported read query: other modules get the summaries, never
 * the `Diagnosis` aggregate.
 */
export class ListUserDiagnosesQuery {
  constructor(
    private readonly diagnoses: DiagnosisRepositoryPort,
    private readonly taxonomy: TaxonomyRepositoryPort,
  ) {}

  async execute(userId: string): Promise<DiagnosticSummary[]> {
    const rows = await this.diagnoses.findAllByUserId(userId);
    const codes = await frameworkVersionCodes(
      this.taxonomy,
      rows.map((d) => d.frameworkVersionId),
    );
    return rows.map((d) => toDiagnosticResponse(d, codes.get(d.frameworkVersionId) ?? ''));
  }
}
