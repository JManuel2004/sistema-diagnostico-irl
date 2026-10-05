import type { Diagnostic } from '@innlab/contracts';
import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import { toDiagnosticResponse } from '../dtos/map-diagnostic-response.js';
import { Diagnosis } from '../../domain/entities/diagnosis.aggregate.js';
import { type TaxonomyRepositoryPort } from '../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';

export interface StartDiagnosisCommand {
  userId: string;
}

/**
 * `StartDiagnosisUseCase` (HU-04 / RF-02).
 *
 * Starts a new diagnostic for the caller, from the beginning (DIAGIRL-26).
 *
 * A diagnostic left unfinished is not resumed from a later session: its
 * answers only ever lived in the browser tab that was closed, so there is
 * nothing to recover. Starting a new one therefore **deletes the user's
 * unfinished diagnostics** first (with their initiative profile snapshot;
 * the initiative and its consent history stay, and can be chosen again).
 * Completed diagnostics are never touched. A diagnostic still open in the
 * current tab is continued from the panel, which goes straight to the
 * wizard and never calls this.
 *
 * A new diagnostic stays in `STARTED`. The privacy consent (RF-03,
 * `RecordConsentUseCase`) and the initiative profile
 * (`RegisterInitiativeUseCase`) move it forward by events.
 */
export class StartDiagnosisUseCase {
  constructor(
    private readonly diagnostics: DiagnosisRepositoryPort,
    private readonly taxonomy: TaxonomyRepositoryPort,
  ) {}

  async execute(cmd: StartDiagnosisCommand): Promise<Diagnostic> {
    // A new diagnostic is answered with the current framework content.
    const current = await this.taxonomy.findCurrentFrameworkVersion();
    if (!current) {
      throw new Error(
        'No IRL framework version is published: run the catalog seed',
      );
    }
    await this.diagnostics.deleteIncompleteByUserId(cmd.userId);
    const diagnosis = Diagnosis.start(cmd.userId, current.id);
    await this.diagnostics.save(diagnosis);

    return toDiagnosticResponse(diagnosis, current.code);
  }
}
