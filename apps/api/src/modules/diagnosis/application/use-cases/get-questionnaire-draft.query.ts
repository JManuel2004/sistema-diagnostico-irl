import type { QuestionnaireDraft as QuestionnaireDraftResponse } from '@innlab/contracts';
import { type DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import { type QuestionnaireDraftRepositoryPort } from '../../domain/repositories/questionnaire-draft.repository.port.js';
import { toQuestionnaireDraftResponse } from '../dtos/map-questionnaire-draft-response.js';
import type { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import { findOwnDiagnosis } from './find-own-diagnosis.js';

export interface GetQuestionnaireDraftInput {
  diagnosticId: string;
  userId: string;
}

/**
 * The questionnaire draft saved for one of the caller's diagnostics, empty
 * when nothing was saved. Someone else's diagnostic is answered as missing,
 * so only the owner ever sees a draft.
 */
export class GetQuestionnaireDraftQuery {
  constructor(
    private readonly diagnoses: DiagnosisRepositoryPort,
    private readonly drafts: QuestionnaireDraftRepositoryPort,
  ) {}

  async execute(
    input: GetQuestionnaireDraftInput,
  ): Promise<Result<QuestionnaireDraftResponse, NotFoundError>> {
    const own = await findOwnDiagnosis(
      this.diagnoses,
      input.diagnosticId,
      input.userId,
    );
    if (!own.ok) return own;
    return Result.ok(
      toQuestionnaireDraftResponse(
        await this.drafts.findByDiagnosticId(input.diagnosticId),
      ),
    );
  }
}
