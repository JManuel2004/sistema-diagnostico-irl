import { Inject, Injectable } from '@nestjs/common';
import type { MaturityProfileResponse } from '@innlab/contracts';
import {
  DIAGNOSTIC_REPOSITORY,
  type DiagnosticRepositoryPort,
} from '../domain/ports/diagnostic.repository.port.js';
import type { DiagnosticStateName } from '../domain/diagnostic-state.vo.js';
import { SubmitQuestionnaireUseCase } from '../../questionnaire/application/submit-questionnaire.use-case.js';
import { ComputeMaturityProfileUseCase } from '../../maturity-profile/application/compute-maturity-profile.use-case.js';
import { toMaturityProfileResponse } from '../../maturity-profile/application/map-maturity-profile-response.js';
import { NotFoundError } from '../../../shared-kernel/domain/errors/not-found.error.js';
import { ConflictError } from '../../../shared-kernel/domain/errors/conflict.error.js';

const FINALIZABLE_STATES: readonly DiagnosticStateName[] = [
  'CUESTIONARIO_EN_CURSO',
  'CUESTIONARIO_COMPLETO',
  'PERFIL_GENERADO',
];

export interface FinalizeInitialDiagnosticCommand {
  diagnosticId: string;
  answers: Array<{ statementId: string; value: number }>;
}

/**
 * Orchestrates the end of phase 1: persist the 48 answers, compute the
 * maturity profile, and advance the diagnostic state machine to
 * `PERFIL_GENERADO`.
 *
 * Other modules do not call each other from HTTP; this use case is the
 * only composer for that sequence.
 */
@Injectable()
export class FinalizeInitialDiagnosticUseCase {
  constructor(
    @Inject(DIAGNOSTIC_REPOSITORY)
    private readonly diagnostics: DiagnosticRepositoryPort,
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

    const { profile, imbalances } = await this.computeProfile.execute({
      diagnosticId: cmd.diagnosticId,
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
