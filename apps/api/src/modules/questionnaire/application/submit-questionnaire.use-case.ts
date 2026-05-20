import { Inject, Injectable } from '@nestjs/common';
import type { SubmitQuestionnaireResponse } from '@innlab/contracts';
import {
  ANSWER_SHEET_REPOSITORY,
  type AnswerSheetRepositoryPort,
} from '../domain/ports/answer-sheet.repository.port.js';
import { AnswerSheet } from '../domain/entities/answer-sheet.aggregate.js';
import { Uuid } from '../../../shared-kernel/domain/value-objects/uuid.vo.js';
import { LikertValue } from '../../../shared-kernel/domain/value-objects/likert-value.vo.js';

export interface SubmitQuestionnaireCommand {
  diagnosticId: string;
  answers: Array<{ statementId: string; value: number }>;
}

@Injectable()
export class SubmitQuestionnaireUseCase {
  constructor(
    @Inject(ANSWER_SHEET_REPOSITORY)
    private readonly repo: AnswerSheetRepositoryPort,
  ) {}

  async execute(cmd: SubmitQuestionnaireCommand): Promise<SubmitQuestionnaireResponse> {
    const diagnosticId = Uuid.create(cmd.diagnosticId);
    const sheet = AnswerSheet.create(diagnosticId);

    for (const item of cmd.answers) {
      sheet.setAnswer(item.statementId, LikertValue.create(item.value));
    }

    await this.repo.save(sheet);

    return {
      diagnosticId: diagnosticId.value,
      answersRecorded: sheet.answeredCount,
      state: 'CUESTIONARIO_COMPLETO',
    };
  }
}
