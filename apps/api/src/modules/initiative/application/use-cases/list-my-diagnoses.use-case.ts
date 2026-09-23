import { Inject, Injectable } from '@nestjs/common';
import type { DiagnosticSummary } from '@innlab/contracts';
import {
  USER_DIAGNOSES,
  type UserDiagnosesPort,
} from '../ports/user-diagnoses.port.js';

/**
 * `ListMyDiagnosesUseCase` (HU-03).
 *
 * Lives in `initiative/`, not `diagnosis/`: the initiative's lifecycle
 * is what spans multiple diagnostics over time, so the read that lists them
 * belongs with that lifecycle. The summaries themselves come from
 * `diagnosis/` through `UserDiagnosesPort`.
 */
@Injectable()
export class ListMyDiagnosesUseCase {
  constructor(
    @Inject(USER_DIAGNOSES)
    private readonly diagnoses: UserDiagnosesPort,
  ) {}

  execute(userId: string): Promise<DiagnosticSummary[]> {
    return this.diagnoses.listByUser(userId);
  }
}
