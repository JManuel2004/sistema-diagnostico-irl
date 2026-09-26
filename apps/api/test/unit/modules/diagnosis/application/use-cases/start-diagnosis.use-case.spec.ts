import { jest } from '@jest/globals';
import { diagnosticSchema } from '@innlab/contracts';
import { StartDiagnosisUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/start-diagnosis.use-case.js';
import type { DiagnosisRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/diagnosis.repository.port.js';
import { frameworkTaxonomy } from '../../support/framework-taxonomy.js';
import { Diagnosis } from '../../../../../../src/modules/diagnosis/domain/entities/diagnosis.aggregate.js';

const EXISTING_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function existing(state: string): Diagnosis {
  return Diagnosis.fromPersistence({
    id: EXISTING_ID,
    userId: 'user-1',
    state,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    frameworkVersionId: 1,
  });
}

describe('StartDiagnosisUseCase', () => {
  let save: jest.Mock<DiagnosisRepositoryPort['save']>;
  let findLatestByUserId: jest.Mock<DiagnosisRepositoryPort['findLatestByUserId']>;
  let useCase: StartDiagnosisUseCase;

  beforeEach(() => {
    save = jest.fn<DiagnosisRepositoryPort['save']>().mockResolvedValue(undefined);
    findLatestByUserId = jest
      .fn<DiagnosisRepositoryPort['findLatestByUserId']>()
      .mockResolvedValue(null);
    useCase = new StartDiagnosisUseCase(
      { save, findLatestByUserId } as unknown as DiagnosisRepositoryPort,
      frameworkTaxonomy(),
    );
  });

  describe('when the user has no diagnostic', () => {
    it('creates one owned by the caller, at the start of the flow', async () => {
      const result = await useCase.execute({ userId: 'user-1' });

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
      const result = await useCase.execute({ userId: 'user-1' });

      expect(save).toHaveBeenCalledTimes(1);
      const saved = save.mock.calls[0][0];
      expect(saved.id.value).toBe(result.id);
      expect(saved.state.value).toBe('STARTED');
    });

    it('looks for the diagnostic of that user only', async () => {
      await useCase.execute({ userId: 'user-1' });

      expect(findLatestByUserId).toHaveBeenCalledWith('user-1');
    });
  });

  // Bug: every click created a new diagnostic and orphaned the one being filled in.
  describe('when the latest diagnostic is not finished', () => {
    it.each([
      'STARTED',
      'WITH_CONSENT',
      'WITH_INITIATIVE',
      'QUESTIONNAIRE_IN_PROGRESS',
      'QUESTIONNAIRE_COMPLETE',
    ])('resumes it in %s instead of creating another', async (state) => {
      findLatestByUserId.mockResolvedValueOnce(existing(state));

      const result = await useCase.execute({ userId: 'user-1' });

      expect(result.id).toBe(EXISTING_ID);
      expect(result.state).toBe(state);
      expect(save).not.toHaveBeenCalled();
    });

    it('returns the same diagnostic on repeated calls', async () => {
      findLatestByUserId.mockResolvedValue(existing('WITH_INITIATIVE'));

      const a = await useCase.execute({ userId: 'user-1' });
      const b = await useCase.execute({ userId: 'user-1' });

      expect(a.id).toBe(b.id);
      expect(save).not.toHaveBeenCalled();
    });
  });

  describe('when the latest diagnostic is complete', () => {
    it.each([
      'PROFILE_GENERATED',
      'DEEP_ANALYSIS_DECLINED',
      'DEEP_ANALYSIS_IN_PROGRESS',
      'DEEP_ANALYSIS_COMPLETE',
    ])('creates a new one, since %s already has its results', async (state) => {
      findLatestByUserId.mockResolvedValueOnce(existing(state));

      const result = await useCase.execute({ userId: 'user-1' });

      expect(result.id).not.toBe(EXISTING_ID);
      expect(result.state).toBe('STARTED');
      expect(save).toHaveBeenCalledTimes(1);
    });
  });
});
