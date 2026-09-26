import { jest } from '@jest/globals';
import { SubmitQuestionnaireUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/submit-questionnaire.use-case.js';
import type { AnswerSheetRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/answer-sheet.repository.port.js';
import type { DiagnosisRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/diagnosis.repository.port.js';
import { Diagnosis } from '../../../../../../src/modules/diagnosis/domain/entities/diagnosis.aggregate.js';
import type { StatementCatalogPort } from '../../../../../../src/modules/diagnosis/domain/repositories/statement-catalog.port.js';
import { ConflictError } from '../../../../../../src/shared/kernel/domain/errors/conflict.error.js';
import { InvariantViolationError } from '../../../../../../src/shared/kernel/domain/errors/invariant-violation.error.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const USER_ID = 'user-1';

/** The 48 statements of the diagnostic's framework version: ids '1'..'48'. */
const STATEMENTS = {
  findStatements: () =>
    Promise.resolve(Array.from({ length: 48 }, (_, i) => ({ id: String(i + 1) }))),
} as unknown as StatementCatalogPort;

function diagnosisIn(state: string): Diagnosis {
  return Diagnosis.fromPersistence({
    id: DIAGNOSTIC_ID,
    userId: USER_ID,
    state,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    frameworkVersionId: 1,
  });
}

describe('SubmitQuestionnaireUseCase', () => {
  let useCase: SubmitQuestionnaireUseCase;
  let mockRepo: jest.Mocked<AnswerSheetRepositoryPort>;
  let owned: Diagnosis;

  beforeEach(() => {
    mockRepo = {
      save: jest.fn<AnswerSheetRepositoryPort['save']>().mockResolvedValue(undefined),
      findByDiagnosticId: jest
        .fn<AnswerSheetRepositoryPort['findByDiagnosticId']>()
        .mockResolvedValue(null),
    };
    owned = diagnosisIn('WITH_INITIATIVE');
    const diagnoses = {
      findById: jest.fn(() => Promise.resolve(owned)),
    } as unknown as DiagnosisRepositoryPort;
    useCase = new SubmitQuestionnaireUseCase(mockRepo, diagnoses, STATEMENTS);
  });

  const fullAnswers = () =>
    Array.from({ length: 48 }, (_, i) => ({
      statementId: String(i + 1),
      value: 3,
      justification: 'Justificación de prueba',
    }));

  it.each(['PROFILE_GENERATED', 'DEEP_ANALYSIS_IN_PROGRESS', 'DEEP_ANALYSIS_COMPLETE'])(
    'refuses to change the answers once the profile exists (%s) and stores nothing',
    async (state) => {
      owned = diagnosisIn(state);

      const result = await useCase.execute({
        diagnosticId: DIAGNOSTIC_ID,
        userId: USER_ID,
        answers: fullAnswers(),
      });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected err result');
      expect(result.error).toBeInstanceOf(ConflictError);
      expect(mockRepo.save).not.toHaveBeenCalled();
    },
  );

  it("rejects an answer to a statement outside the diagnostic's framework version", async () => {
    const answers = fullAnswers();
    answers[0] = { ...answers[0], statementId: '999' };

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID, userId: USER_ID, answers });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(InvariantViolationError);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('saves the answer sheet and returns a response', async () => {
    const answers = Array.from({ length: 48 }, (_, i) => ({
      statementId: String(i + 1),
      value: 3,
      justification: 'Justificación de prueba',
    }));

    const result = await useCase.execute({
      diagnosticId: DIAGNOSTIC_ID,
      userId: USER_ID,
      answers,
    });

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.value.diagnosticId).toBe(DIAGNOSTIC_ID);
    expect(result.value.answersRecorded).toBe(48);
    expect(result.value.state).toBe('QUESTIONNAIRE_COMPLETE');
  });

  it('throws for invalid diagnostic UUID', async () => {
    await expect(useCase.execute({ diagnosticId: 'not-a-uuid', userId: USER_ID, answers: [] })).rejects.toThrow(
      InvariantViolationError,
    );
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('throws for invalid Likert value', async () => {
    await expect(
      useCase.execute({
        diagnosticId: DIAGNOSTIC_ID,
        userId: USER_ID,
        answers: [{ statementId: '1', value: 6, justification: 'Justificación de prueba' }],
      }),
    ).rejects.toThrow(InvariantViolationError);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('upserts duplicate statementId (last write wins)', async () => {
    const answers = [
      { statementId: '1', value: 2, justification: 'Justificación de prueba' },
      ...Array.from({ length: 47 }, (_, i) => ({
        statementId: String(i + 2),
        value: 3,
        justification: 'Justificación de prueba',
      })),
      { statementId: '1', value: 5, justification: 'Justificación de prueba' },
    ];

    const result = await useCase.execute({
      diagnosticId: DIAGNOSTIC_ID,
      userId: USER_ID,
      answers,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.value.answersRecorded).toBe(48);
    const savedSheet = mockRepo.save.mock.calls[0][0];
    expect(savedSheet.getAnswer('1')?.value.value).toBe(5);
  });

  it('rejects submission with fewer than 48 answers and does not persist', async () => {
    const answers = Array.from({ length: 47 }, (_, i) => ({
      statementId: String(i + 1),
      value: 3,
      justification: 'Justificación de prueba',
    }));

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID, userId: USER_ID, answers });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(InvariantViolationError);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('rejects submission with more than 48 distinct answers and does not persist', async () => {
    const answers = Array.from({ length: 49 }, (_, i) => ({
      statementId: String(i + 1),
      value: 3,
      justification: 'Justificación de prueba',
    }));

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID, userId: USER_ID, answers });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(InvariantViolationError);
    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
