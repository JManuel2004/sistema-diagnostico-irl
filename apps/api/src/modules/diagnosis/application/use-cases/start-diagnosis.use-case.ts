import { Inject, Injectable } from '@nestjs/common';
import type { Diagnostic } from '@innlab/contracts';
import {
  DIAGNOSIS_REPOSITORY,
  type DiagnosisRepositoryPort,
} from '../../domain/repositories/diagnosis.repository.port.js';
import { toDiagnosticResponse } from '../dtos/map-diagnostic-response.js';
import { Diagnosis } from '../../domain/entities/diagnosis.aggregate.js';

export interface StartDiagnosisCommand {
  userId: string;
}

/**
 * `StartDiagnosisUseCase` (HU-04 / RF-02).
 *
 * Gives the caller a diagnostic to work on. **It is idempotent per user while
 * one is unfinished:** if the user's latest diagnostic has not produced its
 * profile yet, that one is returned and resumed instead of creating another.
 * Creating a new one on every call left the previous ones orphaned and made
 * the answers already given seem to disappear, because the client moved on to
 * the new diagnostic. Only when the latest one is complete (or the user has
 * none) is a new diagnostic created.
 *
 * A new diagnostic stays in `STARTED`. The privacy consent (RF-03,
 * `RecordConsentUseCase`) and the initiative profile
 * (`RegisterInitiativeUseCase`) move it forward by events.
 *
 * Known limit: the check and the insert are not one atomic step, so two
 * requests that arrive at the same instant (two tabs) can each create one.
 */
@Injectable()
export class StartDiagnosisUseCase {
  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnostics: DiagnosisRepositoryPort,
  ) {}

  async execute(cmd: StartDiagnosisCommand): Promise<Diagnostic> {
    const latest = await this.diagnostics.findLatestByUserId(cmd.userId);
    if (latest && !latest.completed) {
      return toDiagnosticResponse(latest);
    }

    const diagnostico = Diagnosis.start(cmd.userId);
    await this.diagnostics.save(diagnostico);

    return toDiagnosticResponse(diagnostico);
  }
}
