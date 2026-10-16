import type { Diagnostic } from '@innlab/contracts';
import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import { toDiagnosticResponse } from '../dtos/map-diagnostic-response.js';
import { Diagnosis } from '../../domain/entities/diagnosis.aggregate.js';
import { DiagnosisInProgressError } from '../../domain/exceptions/diagnosis-in-progress.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import { type TaxonomyRepositoryPort } from '../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';

export interface StartDiagnosisCommand {
  userId: string;
  /**
   * The user chose to discard the diagnostic they have in progress. Without
   * it, having one answers `DiagnosisInProgressError` and deletes nothing.
   */
  discardInProgress?: boolean;
}

/**
 * `StartDiagnosisUseCase` (HU-04 / RF-02).
 *
 * Starts a new diagnostic for the caller, from the beginning (DIAGIRL-26).
 *
 * A diagnostic left unfinished keeps its questionnaire draft on the server
 * and is continued from the panel, from any session. Starting a new one
 * therefore asks first: while the user has one in progress the result is
 * `DiagnosisInProgressError`, and only with `discardInProgress` are the
 * unfinished diagnostics deleted (with their initiative profile snapshot
 * and their draft; the initiative and its consent history stay, and can be
 * chosen again). Completed diagnostics are never touched.
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

  async execute(
    cmd: StartDiagnosisCommand,
  ): Promise<Result<Diagnostic, DiagnosisInProgressError>> {
    // A new diagnostic is answered with the current framework content.
    const current = await this.taxonomy.findCurrentFrameworkVersion();
    if (!current) {
      throw new Error(
        'No IRL framework version is published: run the catalog seed',
      );
    }
    if (cmd.discardInProgress !== true) {
      const inProgress = (
        await this.diagnostics.findAllByUserId(cmd.userId)
      ).find((d) => !d.completed);
      if (inProgress)
        return Result.err(new DiagnosisInProgressError(inProgress.id.value));
    }
    await this.diagnostics.deleteIncompleteByUserId(cmd.userId);
    const diagnosis = Diagnosis.start(cmd.userId, current.id);
    await this.diagnostics.save(diagnosis);

    return Result.ok(toDiagnosticResponse(diagnosis, current.code));
  }
}
