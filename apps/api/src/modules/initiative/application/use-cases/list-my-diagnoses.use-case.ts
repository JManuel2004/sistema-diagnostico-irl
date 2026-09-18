import { Inject, Injectable } from '@nestjs/common';
import type { DiagnosticSummary } from '@innlab/contracts';
import {
  DIAGNOSIS_REPOSITORY,
  type DiagnosisRepositoryPort,
} from '../../../diagnosis/domain/repositories/diagnosis.repository.port.js';

/**
 * `ListMyDiagnosesUseCase` (HU-03 — backlog 11.3).
 *
 * Lives in `initiative/`, not `diagnosis/`: the initiative's lifecycle
 * is what spans multiple diagnostics over time (`convenciones-objetivo.md`
 * §1.1 — "el historial de diagnósticos... ahora es capacidad de
 * `initiative/`, no de `diagnosis/`"), so the read that lists them
 * belongs with that lifecycle, not with the single-diagnostic module.
 * `DiagnosisRepositoryPort.findAllByUserId` was already declared for
 * this; nothing called it until now.
 */
@Injectable()
export class ListMyDiagnosesUseCase {
  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnoses: DiagnosisRepositoryPort,
  ) {}

  async execute(userId: string): Promise<DiagnosticSummary[]> {
    const rows = await this.diagnoses.findAllByUserId(userId);
    return rows.map((d) => ({
      id: d.id.value,
      userId: d.userId,
      state: d.state.value,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));
  }
}
