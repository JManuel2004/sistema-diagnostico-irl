import { Inject, Injectable } from '@nestjs/common';
import type { MaturityProfileResponse } from '@innlab/contracts';
import {
  DIAGNOSIS_REPOSITORY,
  type DiagnosisRepositoryPort,
} from '../../domain/repositories/diagnosis.repository.port.js';
import type { DiagnosisStateName } from '../../domain/value-objects/diagnosis-state.vo.js';
import { SubmitQuestionnaireUseCase } from './submit-questionnaire.use-case.js';
import {
  ANSWER_SHEET_REPOSITORY,
  type AnswerSheetRepositoryPort,
} from '../../domain/repositories/answer-sheet.repository.port.js';
import { ComputeMaturityProfileUseCase } from './compute-maturity-profile.use-case.js';
import { toMaturityProfileResponse } from '../dtos/map-maturity-profile-response.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';
import { MaturityProfileCalculationError } from '../../domain/exceptions/maturity-profile-calculation.error.js';

const FINALIZABLE_STATES: readonly DiagnosisStateName[] = [
  'QUESTIONNAIRE_IN_PROGRESS',
  'QUESTIONNAIRE_COMPLETE',
  'PROFILE_GENERATED',
  'DEEP_ANALYSIS_DECLINED',
  'DEEP_ANALYSIS_IN_PROGRESS',
  'DEEP_ANALYSIS_COMPLETE',
];

export interface FinalizeInitialDiagnosticCommand {
  diagnosticId: string;
  answers: { statementId: string; value: number }[];
}

@Injectable()
export class FinalizeInitialDiagnosisUseCase {
  constructor(
    @Inject(DIAGNOSIS_REPOSITORY)
    private readonly diagnostics: DiagnosisRepositoryPort,
    @Inject(ANSWER_SHEET_REPOSITORY)
    private readonly answerSheets: AnswerSheetRepositoryPort,
    private readonly submitQuestionnaire: SubmitQuestionnaireUseCase,
    private readonly computeProfile: ComputeMaturityProfileUseCase,
  ) {}

  async execute(
    cmd: FinalizeInitialDiagnosticCommand,
  ): Promise<MaturityProfileResponse> {
    const diagnostico = await this.diagnostics.findById(cmd.diagnosticId);
    if (!diagnostico) {
      throw new NotFoundError('Diagnosis', cmd.diagnosticId);
    }

    const current = diagnostico.state.value;
    if (!FINALIZABLE_STATES.includes(current)) {
      throw new ConflictError(
        `Diagnosis cannot be finalized from state ${current}`,
        { diagnosticId: cmd.diagnosticId, state: current },
      );
    }

    await this.submitQuestionnaire.execute({
      diagnosticId: cmd.diagnosticId,
      answers: cmd.answers,
    });

    const sheet = await this.answerSheets.findByDiagnosticId(cmd.diagnosticId);
    if (!sheet) {
      throw new MaturityProfileCalculationError(
        `No answer sheet found for diagnostic ${cmd.diagnosticId}`,
        { diagnosticId: cmd.diagnosticId },
      );
    }

    const { profile, imbalances } = await this.computeProfile.execute({
      diagnosticId: cmd.diagnosticId,
      answers: sheet.answers().map((a) => ({
        statementId: a.statementId,
        value: a.value.value,
      })),
    });

    if (diagnostico.state.canTransitionTo('QUESTIONNAIRE_COMPLETE')) {
      diagnostico.transitionTo('QUESTIONNAIRE_COMPLETE');
    }
    if (diagnostico.state.canTransitionTo('PROFILE_GENERATED')) {
      diagnostico.transitionTo('PROFILE_GENERATED');
    }

    await this.diagnostics.save(diagnostico);

    return toMaturityProfileResponse(profile, imbalances);
  }
}
