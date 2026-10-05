import type { DiagnosticSummary } from '@innlab/contracts';
import { type UserDiagnosesPort } from '../ports/user-diagnoses.port.js';
import { type InitiativeProfileRepositoryPort } from '../../domain/repositories/initiative-profile.repository.port.js';

/**
 * `ListMyDiagnosesUseCase` (HU-03, DIAGIRL-26).
 *
 * The user's completed diagnostics, most recent first, each named by the
 * initiative it was answered for (the profile snapshot of that
 * diagnostic). Lives in `initiative/`, not `diagnosis/`: the initiative's
 * lifecycle is what spans multiple diagnostics over time, so the read
 * that lists them belongs with that lifecycle. The summaries themselves
 * come from `diagnosis/` through `UserDiagnosesPort`.
 */
export class ListMyDiagnosesUseCase {
  constructor(
    private readonly diagnoses: UserDiagnosesPort,
    private readonly profiles: InitiativeProfileRepositoryPort,
  ) {}

  async execute(userId: string): Promise<DiagnosticSummary[]> {
    const summaries = await this.diagnoses.listByUser(userId);
    const profiles = await Promise.all(
      summaries.map((s) => this.profiles.findByDiagnosticId(s.id)),
    );
    return summaries.map((s, i) => ({
      ...s,
      initiativeName: profiles[i]?.name ?? null,
    }));
  }
}
