import type { DiagnosticSummary } from '@innlab/contracts';
import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import { toDiagnosticResponse } from '../dtos/map-diagnostic-response.js';

/**
 * The diagnostics of one user, most recent first, as the contract's
 * summaries. Exported read query: other modules get the summaries, never
 * the `Diagnosis` aggregate.
 */
export class ListUserDiagnosesQuery {
  constructor(private readonly diagnoses: DiagnosisRepositoryPort) {}

  async execute(userId: string): Promise<DiagnosticSummary[]> {
    const rows = await this.diagnoses.findAllByUserId(userId);
    return rows.map(toDiagnosticResponse);
  }
}
