import { jest } from '@jest/globals';
import { FinalizeInitialDiagnosticUseCase } from '../../../../src/modules/diagnostic/application/finalize-initial-diagnostic.use-case.js';
import type { DiagnosticRepositoryPort } from '../../../../src/modules/diagnostic/domain/ports/diagnostic.repository.port.js';
import { Diagnostico } from '../../../../src/modules/diagnostic/domain/diagnostic.aggregate.js';
import { SubmitQuestionnaireUseCase } from '../../../../src/modules/questionnaire/application/submit-questionnaire.use-case.js';
import { ComputeMaturityProfileUseCase } from '../../../../src/modules/maturity-profile/application/compute-maturity-profile.use-case.js';
import type { AnswerSheetRepositoryPort } from '../../../../src/modules/questionnaire/domain/ports/answer-sheet.repository.port.js';
import { AnswerSheet } from '../../../../src/modules/questionnaire/domain/entities/answer-sheet.aggregate.js';
import { MaturityProfile } from '../../../../src/modules/maturity-profile/domain/entities/maturity-profile.aggregate.js';
import { DimensionResult } from '../../../../src/modules/maturity-profile/domain/value-objects/dimension-result.vo.js';
import { DimensionCode } from '../../../../src/shared-kernel/domain/value-objects/dimension-code.js';
import { IrlLevel } from '../../../../src/shared-kernel/domain/value-objects/irl-level.vo.js';
import { LikertValue } from '../../../../src/shared-kernel/domain/value-objects/likert-value.vo.js';
import { Uuid } from '../../../../src/shared-kernel/domain/value-objects/uuid.vo.js';
import { NotFoundError } from '../../../../src/shared-kernel/domain/errors/not-found.error.js';
import { ConflictError } from '../../../../src/shared-kernel/domain/errors/conflict.error.js';
import { InvariantViolationError } from '../../../../src/shared-kernel/domain/errors/invariant-violation.error.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const ANSWERS = Array.from({ length: 48 }, (_, i) => ({
  statementId: String(i + 1),
  value: 3,
}));

function diagnosticoIn(state: string): Diagnostico {
  return Diagnostico.fromPersistence({
    id: DIAGNOSTIC_ID,
    userId: 'usuario-demo',
    state,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

function anAnswerSheet(): AnswerSheet {
  const sheet = AnswerSheet.create(Uuid.create(DIAGNOSTIC_ID));
  for (const item of ANSWERS) {
    sheet.setAnswer(item.statementId, LikertValue.create(item.value));
  }
  return sheet;
}

function aProfile(): MaturityProfile {
  const codes = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;
  return MaturityProfile.create({
    diagnosticId: Uuid.create(DIAGNOSTIC_ID),
    computedAt: new Date('2026-01-01T12:00:00.000Z'),
    dimensionResults: codes.map((code) =>
      DimensionResult.create({
        dimensionCode: DimensionCode.create(code),
        averageLikert: 3,
        irlLevel: IrlLevel.create(6),
      }),
    ),
  });
}

describe('FinalizeInitialDiagnosticUseCase', () => {
  let useCase: FinalizeInitialDiagnosticUseCase;
  let diagnostics: jest.Mocked<DiagnosticRepositoryPort>;
  let answerSheets: jest.Mocked<AnswerSheetRepositoryPort>;
  let submitQuestionnaire: jest.Mocked<Pick<SubmitQuestionnaireUseCase, 'execute'>>;
  let computeProfile: jest.Mocked<Pick<ComputeMaturityProfileUseCase, 'execute'>>;

  beforeEach(() => {
    diagnostics = {
      findById: jest.fn(),
      findLatestByUserId: jest.fn(),
      findAllByUserId: jest.fn(),
      save: jest.fn(async () => undefined),
    };
    answerSheets = {
      findByDiagnosticId: jest.fn(async () => anAnswerSheet()),
      save: jest.fn(async () => undefined),
    };
    submitQuestionnaire = { execute: jest.fn(async () => ({
      diagnosticId: DIAGNOSTIC_ID,
      answersRecorded: 48,
      state: 'CUESTIONARIO_COMPLETO' as const,
    })) };
    computeProfile = { execute: jest.fn(async () => ({ profile: aProfile(), imbalances: [] })) };

    useCase = new FinalizeInitialDiagnosticUseCase(
      diagnostics,
      answerSheets,
      submitQuestionnaire as unknown as SubmitQuestionnaireUseCase,
      computeProfile as unknown as ComputeMaturityProfileUseCase,
    );
  });

  it('submits answers, computes the profile, and transitions to PERFIL_GENERADO', async () => {
    diagnostics.findById.mockResolvedValueOnce(diagnosticoIn('CUESTIONARIO_EN_CURSO'));

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID, answers: ANSWERS });

    expect(submitQuestionnaire.execute).toHaveBeenCalledWith({
      diagnosticId: DIAGNOSTIC_ID,
      answers: ANSWERS,
    });
    expect(answerSheets.findByDiagnosticId).toHaveBeenCalledWith(DIAGNOSTIC_ID);
    expect(computeProfile.execute).toHaveBeenCalledWith({
      diagnosticId: DIAGNOSTIC_ID,
      answers: ANSWERS,
    });
    expect(diagnostics.save).toHaveBeenCalledTimes(1);
    const saved = diagnostics.save.mock.calls[0][0];
    expect(saved.state.value).toBe('PERFIL_GENERADO');
    expect(result.diagnosticId).toBe(DIAGNOSTIC_ID);
    expect(result.dimensionResults).toHaveLength(6);
  });

  it('advances from CUESTIONARIO_COMPLETO to PERFIL_GENERADO', async () => {
    diagnostics.findById.mockResolvedValueOnce(diagnosticoIn('CUESTIONARIO_COMPLETO'));

    await useCase.execute({ diagnosticId: DIAGNOSTIC_ID, answers: ANSWERS });

    const saved = diagnostics.save.mock.calls[0][0];
    expect(saved.state.value).toBe('PERFIL_GENERADO');
  });

  it('loads a phase-2 diagnostic and finalizes without regressing state', async () => {
    diagnostics.findById.mockResolvedValueOnce(
      diagnosticoIn('ANALISIS_PROFUNDO_EN_CURSO'),
    );

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID, answers: ANSWERS });

    expect(submitQuestionnaire.execute).toHaveBeenCalledTimes(1);
    expect(computeProfile.execute).toHaveBeenCalledTimes(1);
    const saved = diagnostics.save.mock.calls[0][0];
    expect(saved.state.value).toBe('ANALISIS_PROFUNDO_EN_CURSO');
    expect(result.diagnosticId).toBe(DIAGNOSTIC_ID);
  });

  it('is idempotent when the diagnostic is already PERFIL_GENERADO', async () => {
    diagnostics.findById.mockResolvedValueOnce(diagnosticoIn('PERFIL_GENERADO'));

    await useCase.execute({ diagnosticId: DIAGNOSTIC_ID, answers: ANSWERS });

    expect(submitQuestionnaire.execute).toHaveBeenCalledTimes(1);
    expect(computeProfile.execute).toHaveBeenCalledTimes(1);
    const saved = diagnostics.save.mock.calls[0][0];
    expect(saved.state.value).toBe('PERFIL_GENERADO');
  });

  it('throws NotFoundError when the diagnostic does not exist', async () => {
    diagnostics.findById.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({ diagnosticId: DIAGNOSTIC_ID, answers: ANSWERS }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(submitQuestionnaire.execute).not.toHaveBeenCalled();
    expect(computeProfile.execute).not.toHaveBeenCalled();
  });

  it('rejects finalization from an earlier state', async () => {
    diagnostics.findById.mockResolvedValueOnce(diagnosticoIn('INICIADO'));

    await expect(
      useCase.execute({ diagnosticId: DIAGNOSTIC_ID, answers: ANSWERS }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(submitQuestionnaire.execute).not.toHaveBeenCalled();
  });

  it('does not transition state if computation fails', async () => {
    diagnostics.findById.mockResolvedValueOnce(diagnosticoIn('CUESTIONARIO_EN_CURSO'));
    computeProfile.execute.mockRejectedValueOnce(new Error('calc failed') as never);

    await expect(
      useCase.execute({ diagnosticId: DIAGNOSTIC_ID, answers: ANSWERS }),
    ).rejects.toThrow('calc failed');
    expect(diagnostics.save).not.toHaveBeenCalled();
  });

  it('does not skip the linear state machine', () => {
    const d = diagnosticoIn('CUESTIONARIO_EN_CURSO');
    expect(() => d.transitionTo('PERFIL_GENERADO')).toThrow(InvariantViolationError);
  });
});
