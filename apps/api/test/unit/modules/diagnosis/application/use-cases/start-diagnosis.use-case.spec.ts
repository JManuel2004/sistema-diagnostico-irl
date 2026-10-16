import { jest } from '@jest/globals';
import { diagnosticSchema, type Diagnostic } from '@innlab/contracts';
import { StartDiagnosisUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/start-diagnosis.use-case.js';
import { Diagnosis } from '../../../../../../src/modules/diagnosis/domain/entities/diagnosis.aggregate.js';
import { DiagnosisInProgressError } from '../../../../../../src/modules/diagnosis/domain/exceptions/diagnosis-in-progress.error.js';
import type { DiagnosisRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/diagnosis.repository.port.js';
import type { Result } from '../../../../../../src/shared/kernel/domain/result.js';
import { frameworkTaxonomy } from '../../support/framework-taxonomy.js';

/** An id no new diagnostic can take. */
const EXISTING_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function diagnosisIn(state: string): Diagnosis {
  return Diagnosis.fromPersistence({
    id: EXISTING_ID,
    userId: 'user-1',
    state,
    frameworkVersionId: 1,
    createdAt: new Date('2026-10-01T10:00:00Z'),
  });
}

function value(
  result: Result<Diagnostic, DiagnosisInProgressError>,
): Diagnostic {
  if (!result.ok) throw new Error('expected ok result');
  return result.value;
}

describe('StartDiagnosisUseCase', () => {
  let save: jest.Mock<DiagnosisRepositoryPort['save']>;
  let findAllByUserId: jest.Mock<DiagnosisRepositoryPort['findAllByUserId']>;
  let deleteIncompleteByUserId: jest.Mock<
    DiagnosisRepositoryPort['deleteIncompleteByUserId']
  >;
  let useCase: StartDiagnosisUseCase;

  beforeEach(() => {
    save = jest
      .fn<DiagnosisRepositoryPort['save']>()
      .mockResolvedValue(undefined);
    findAllByUserId = jest
      .fn<DiagnosisRepositoryPort['findAllByUserId']>()
      .mockResolvedValue([]);
    deleteIncompleteByUserId = jest
      .fn<DiagnosisRepositoryPort['deleteIncompleteByUserId']>()
      .mockResolvedValue(0);
    useCase = new StartDiagnosisUseCase(
      {
        save,
        findAllByUserId,
        deleteIncompleteByUserId,
      } as unknown as DiagnosisRepositoryPort,
      frameworkTaxonomy(),
    );
  });

  it('creates one owned by the caller, at the start of the flow', async () => {
    const result = value(await useCase.execute({ userId: 'user-1' }));

    expect(() => diagnosticSchema.parse(result)).not.toThrow();
    expect(result.userId).toBe('user-1');
    // Consent and initiative come next; neither is skipped.
    expect(result.state).toBe('STARTED');
    expect(result.completed).toBe(false);
    expect(result.deepAnalysisAccepted).toBe(false);
    // Answered with the current framework version.
    expect(result.frameworkVersion).toBe('KTH-IRL-1.0');
  });

  it('saves the diagnostic it returns', async () => {
    const result = value(await useCase.execute({ userId: 'user-1' }));

    expect(save).toHaveBeenCalledTimes(1);
    const saved = save.mock.calls[0][0];
    expect(saved.id.value).toBe(result.id);
    expect(saved.state.value).toBe('STARTED');
  });

  describe('with a diagnostic in progress', () => {
    it.each(['STARTED', 'WITH_INITIATIVE', 'QUESTIONNAIRE_IN_PROGRESS'])(
      'asks first: answers DiagnosisInProgressError and deletes nothing (%s)',
      async (state) => {
        findAllByUserId.mockResolvedValueOnce([diagnosisIn(state)]);

        const result = await useCase.execute({ userId: 'user-1' });

        expect(result.ok).toBe(false);
        if (result.ok) throw new Error('expected err result');
        expect(result.error).toBeInstanceOf(DiagnosisInProgressError);
        expect(result.error.diagnosticId).toBe(EXISTING_ID);
        expect(deleteIncompleteByUserId).not.toHaveBeenCalled();
        expect(save).not.toHaveBeenCalled();
      },
    );

    it('once the user chose to discard it, deletes it before creating the new one', async () => {
      findAllByUserId.mockResolvedValueOnce([diagnosisIn('WITH_INITIATIVE')]);
      deleteIncompleteByUserId.mockResolvedValueOnce(1);

      const result = value(
        await useCase.execute({ userId: 'user-1', discardInProgress: true }),
      );

      expect(deleteIncompleteByUserId).toHaveBeenCalledWith('user-1');
      expect(deleteIncompleteByUserId.mock.invocationCallOrder[0]).toBeLessThan(
        save.mock.invocationCallOrder[0],
      );
      expect(result.id).not.toBe(EXISTING_ID);
      expect(result.state).toBe('STARTED');
    });
  });

  it('a completed diagnostic is not in progress: a new one starts without asking', async () => {
    findAllByUserId.mockResolvedValueOnce([diagnosisIn('PROFILE_GENERATED')]);

    const result = await useCase.execute({ userId: 'user-1' });

    expect(result.ok).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('creates a new diagnostic on every call: starting is always from the beginning', async () => {
    const a = value(await useCase.execute({ userId: 'user-1' }));
    const b = value(await useCase.execute({ userId: 'user-1' }));

    expect(a.id).not.toBe(b.id);
    expect(save).toHaveBeenCalledTimes(2);
  });
});
