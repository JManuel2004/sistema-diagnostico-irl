import type { DiagnosticSummary } from '@innlab/contracts';
import { type UserDiagnosesPort } from '../ports/user-diagnoses.port.js';

/**
 * `ListMyDiagnosesUseCase` (HU-03).
 *
 * Lives in `initiative/`, not `diagnosis/`: the initiative's lifecycle
 * is what spans multiple diagnostics over time, so the read that lists them
 * belongs with that lifecycle. The summaries themselves come from
 * `diagnosis/` through `UserDiagnosesPort`.
 */
export class ListMyDiagnosesUseCase {
  constructor(private readonly diagnoses: UserDiagnosesPort) {}

  execute(userId: string): Promise<DiagnosticSummary[]> {
    return this.diagnoses.listByUser(userId);
  }
}
