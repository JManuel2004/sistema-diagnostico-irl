import { Inject, Injectable } from '@nestjs/common';
import { toDiagnosticResponse } from '../../../diagnosis/application/dtos/map-diagnostic-response.js';
import type { DiagnosticSummary } from '@innlab/contracts';
import {
  DIAGNOSIS_REPOSITORY,
  type DiagnosisRepositoryPort,
} from '../../../diagnosis/domain/repositories/diagnosis.repository.port.js';

/**
 * `ListMyDiagnosesUseCase` (HU-03).
 *
 * Lives in `initiative/`, not `diagnosis/`: the initiative's lifecycle
 * is what spans multiple diagnostics over time, so the read that lists them
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
    return rows.map(toDiagnosticResponse);
  }
}
