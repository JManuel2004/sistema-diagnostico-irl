import { jest } from '@jest/globals';
import { diagnosticSchema } from '@innlab/contracts';
import { GetDiagnosisUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/get-diagnosis.use-case.js';
import type { DiagnosisRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/diagnosis.repository.port.js';
import { Diagnosis } from '../../../../../../src/modules/diagnosis/domain/entities/diagnosis.aggregate.js';
import { frameworkTaxonomy } from '../../support/framework-taxonomy.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';

const ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function diagnosisIn(state: string, userId = 'user-1'): Diagnosis {
  return Diagnosis.fromPersistence({
    id: ID,
    userId,
    state,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    frameworkVersionId: 1,
  });
}

describe('GetDiagnosisUseCase', () => {
  let findById: jest.Mock<DiagnosisRepositoryPort['findById']>;
  let useCase: GetDiagnosisUseCase;

  beforeEach(() => {
    findById = jest.fn();
    useCase = new GetDiagnosisUseCase(
      { findById } as unknown as DiagnosisRepositoryPort,
      frameworkTaxonomy(),
    );
  });

  it("returns the caller's diagnostic as the contract describes it", async () => {
    findById.mockResolvedValueOnce(diagnosisIn('PROFILE_GENERATED'));

    const result = await useCase.execute({
      diagnosticId: ID,
      userId: 'user-1',
    });

    if (!result.ok) throw new Error('expected ok result');
    expect(() => diagnosticSchema.parse(result.value)).not.toThrow();
    expect(result.value.state).toBe('PROFILE_GENERATED');
  });

  // The results page decides what to show from this flag,
  // computed by the backend and not inferred from the state by the client.
  it.each([
    ['WITH_INITIATIVE', false],
    ['QUESTIONNAIRE_IN_PROGRESS', false],
    ['PROFILE_GENERATED', false],
    ['DEEP_ANALYSIS_DECLINED', false],
    ['DEEP_ANALYSIS_IN_PROGRESS', true],
    ['DEEP_ANALYSIS_COMPLETE', true],
  ])('in %s the deep analysis accepted flag is %s', async (state, accepted) => {
    findById.mockResolvedValueOnce(diagnosisIn(state));

    const result = await useCase.execute({
      diagnosticId: ID,
      userId: 'user-1',
    });

    if (!result.ok) throw new Error('expected ok result');
    expect(result.value.deepAnalysisAccepted).toBe(accepted);
  });

  // The full report (RF-16) exists only once both results are saved: an
  // accepted analysis still in progress has no report yet.
  it.each([
    ['PROFILE_GENERATED', false],
    ['DEEP_ANALYSIS_DECLINED', false],
    ['DEEP_ANALYSIS_IN_PROGRESS', false],
    ['DEEP_ANALYSIS_COMPLETE', true],
  ])(
    'in %s the deep analysis completed flag is %s',
    async (state, completed) => {
      findById.mockResolvedValueOnce(diagnosisIn(state));

      const result = await useCase.execute({
        diagnosticId: ID,
        userId: 'user-1',
      });

      if (!result.ok) throw new Error('expected ok result');
      expect(result.value.deepAnalysisCompleted).toBe(completed);
    },
  );

  // The client decides "resume the wizard or show the results" from this flag.
  it.each([
    ['STARTED', false],
    ['WITH_CONSENT', false],
    ['WITH_INITIATIVE', false],
    ['QUESTIONNAIRE_IN_PROGRESS', false],
    ['QUESTIONNAIRE_COMPLETE', false],
    ['PROFILE_GENERATED', true],
    ['DEEP_ANALYSIS_DECLINED', true],
    ['DEEP_ANALYSIS_IN_PROGRESS', true],
    ['DEEP_ANALYSIS_COMPLETE', true],
  ])('in %s the completed flag is %s', async (state, completed) => {
    findById.mockResolvedValueOnce(diagnosisIn(state));

    const result = await useCase.execute({
      diagnosticId: ID,
      userId: 'user-1',
    });

    if (!result.ok) throw new Error('expected ok result');
    expect(result.value.completed).toBe(completed);
  });

  it('answers not found for a diagnostic that does not exist', async () => {
    findById.mockResolvedValueOnce(null);

    const result = await useCase.execute({
      diagnosticId: ID,
      userId: 'user-1',
    });

    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it("answers not found, not forbidden, for someone else's diagnostic", async () => {
    findById.mockResolvedValueOnce(
      diagnosisIn('PROFILE_GENERATED', 'someone-else'),
    );

    const result = await useCase.execute({
      diagnosticId: ID,
      userId: 'user-1',
    });

    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
