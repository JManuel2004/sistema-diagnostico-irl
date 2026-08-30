import { Inject, Injectable } from '@nestjs/common';
import type { MaturityProfileResponse } from '@innlab/contracts';
import {
  DIAGNOSTIC_REPOSITORY,
  type DiagnosticRepositoryPort,
} from '../domain/ports/diagnostic.repository.port.js';
import type { DiagnosticStateName } from '../domain/diagnostic-state.vo.js';
import { SubmitQuestionnaireUseCase } from '../../questionnaire/application/submit-questionnaire.use-case.js';
import {
  ANSWER_SHEET_REPOSITORY,
  type AnswerSheetRepositoryPort,
} from '../../questionnaire/domain/ports/answer-sheet.repository.port.js';
import { ComputeMaturityProfileUseCase } from '../../maturity-profile/application/compute-maturity-profile.use-case.js';
import { toMaturityProfileResponse } from '../../maturity-profile/application/map-maturity-profile-response.js';
import { NotFoundError } from '../../../shared-kernel/domain/errors/not-found.error.js';
import { ConflictError } from '../../../shared-kernel/domain/errors/conflict.error.js';
import { MaturityProfileCalculationError } from '../../maturity-profile/domain/errors/maturity-profile-calculation.error.js';

const FINALIZABLE_STATES: readonly DiagnosticStateName[] = [
  'CUESTIONARIO_EN_CURSO',
  'CUESTIONARIO_COMPLETO',
  'PERFIL_GENERADO',
  'ANALISIS_PROFUNDO_DECLINADO',
  'ANALISIS_PROFUNDO_EN_CURSO',
  'ANALISIS_PROFUNDO_COMPLETO',
];

export interface FinalizeInitialDiagnosticCommand {
  diagnosticId: string;
  answers: Array<{ statementId: string; value: number }>;
}

@Injectable()
export class FinalizeInitialDiagnosticUseCase {
  constructor(
    @Inject(DIAGNOSTIC_REPOSITORY)
    private readonly diagnostics: DiagnosticRepositoryPort,
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
      throw new NotFoundError('Diagnostico', cmd.diagnosticId);
    }

    const current = diagnostico.state.value;
    if (!FINALIZABLE_STATES.includes(current)) {
      throw new ConflictError(
        `Diagnostic cannot be finalized from state ${current}`,
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

    if (diagnostico.state.canTransitionTo('CUESTIONARIO_COMPLETO')) {
      diagnostico.transitionTo('CUESTIONARIO_COMPLETO');
    }
    if (diagnostico.state.canTransitionTo('PERFIL_GENERADO')) {
      diagnostico.transitionTo('PERFIL_GENERADO');
    }

    await this.diagnostics.save(diagnostico);

    return toMaturityProfileResponse(profile, imbalances);
  }
}
