import { Inject, Injectable } from '@nestjs/common';
import type { SubmitQuestionnaireResponse } from '@innlab/contracts';
import {
  ANSWER_SHEET_REPOSITORY,
  type AnswerSheetRepositoryPort,
} from '../../domain/repositories/answer-sheet.repository.port.js';
import { AnswerSheet } from '../../domain/entities/answer-sheet.aggregate.js';
import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { LikertValue } from '../../../../shared/kernel/domain/value-objects/likert-value.vo.js';
import { InvariantViolationError } from '../../../../shared/kernel/domain/errors/invariant-violation.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

export interface SubmitQuestionnaireCommand {
  diagnosticId: string;
  answers: { statementId: string; value: number; justification: string }[];
}

/**
 * An incomplete submission (not exactly 48 answers) is a normal, expected
 * outcome of this use case — a user can submit early, or a client bug can
 * drop an answer — not an exceptional condition, so it comes back as
 * `Result.err` instead of a thrown exception.
 */
@Injectable()
export class SubmitQuestionnaireUseCase {
  constructor(
    @Inject(ANSWER_SHEET_REPOSITORY)
    private readonly repo: AnswerSheetRepositoryPort,
  ) {}

  async execute(
    cmd: SubmitQuestionnaireCommand,
  ): Promise<Result<SubmitQuestionnaireResponse, InvariantViolationError>> {
    const diagnosticId = Uuid.create(cmd.diagnosticId);
    const sheet = AnswerSheet.create(diagnosticId);

    for (const item of cmd.answers) {
      sheet.setAnswer(item.statementId, LikertValue.create(item.value), item.justification);
    }

    if (sheet.answeredCount !== 48) {
      return Result.err(
        new InvariantViolationError(
          `Cannot submit questionnaire: expected 48 answers, received ${sheet.answeredCount}`,
          { diagnosticId: diagnosticId.value, answeredCount: sheet.answeredCount },
        ),
      );
    }

    await this.repo.save(sheet);

    return Result.ok({
      diagnosticId: diagnosticId.value,
      answersRecorded: sheet.answeredCount,
      state: 'QUESTIONNAIRE_COMPLETE',
    });
  }
}
