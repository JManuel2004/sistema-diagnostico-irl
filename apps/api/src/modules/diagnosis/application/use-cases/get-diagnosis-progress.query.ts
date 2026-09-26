import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';

/** What another module may know about how far a diagnostic went. */
export interface DiagnosisProgress {
  /** The deep analysis was accepted: its inputs are frozen. */
  readonly deepAnalysisAccepted: boolean;
}

/**
 * Exported read query: the progress of a diagnostic, or `null` if it does
 * not exist. `initiative/` reads it to refuse correcting the initiative
 * profile once the deep analysis was accepted, since the recommendation was
 * computed from it.
 */
export class GetDiagnosisProgressQuery {
  constructor(private readonly diagnoses: DiagnosisRepositoryPort) {}

  async execute(diagnosticId: string): Promise<DiagnosisProgress | null> {
    const diagnosis = await this.diagnoses.findById(diagnosticId);
    return diagnosis ? { deepAnalysisAccepted: diagnosis.deepAnalysisAccepted } : null;
  }
}
