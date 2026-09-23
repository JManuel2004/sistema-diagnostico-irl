import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';

/**
 * Who owns a diagnostic: the owner's user id, or `null` if the diagnostic
 * does not exist. Exported read query so other modules can check ownership
 * before writing without seeing the `Diagnosis` aggregate.
 */
export class FindDiagnosisOwnerQuery {
  constructor(private readonly diagnoses: DiagnosisRepositoryPort) {}

  async execute(diagnosticId: string): Promise<string | null> {
    const diagnosis = await this.diagnoses.findById(diagnosticId);
    return diagnosis?.userId ?? null;
  }
}
