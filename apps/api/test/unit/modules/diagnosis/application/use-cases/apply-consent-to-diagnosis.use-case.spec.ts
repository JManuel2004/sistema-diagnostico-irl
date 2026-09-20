import { jest } from '@jest/globals';
import { ApplyConsentToDiagnosisUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/apply-consent-to-diagnosis.use-case.js';
import type { DiagnosisRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/diagnosis.repository.port.js';
import { Diagnosis } from '../../../../../../src/modules/diagnosis/domain/entities/diagnosis.aggregate.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function diagnosisIn(state: string): Diagnosis {
  return Diagnosis.fromPersistence({
    id: DIAGNOSTIC_ID,
    userId: 'usuario-demo',
    state,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('ApplyConsentToDiagnosisUseCase', () => {
  let diagnostics: jest.Mocked<DiagnosisRepositoryPort>;
  let useCase: ApplyConsentToDiagnosisUseCase;

  beforeEach(() => {
    diagnostics = {
      findById: jest.fn(),
      findLatestByUserId: jest.fn(),
      findAllByUserId: jest.fn(),
      save: jest.fn(() => Promise.resolve(undefined)),
    };
    useCase = new ApplyConsentToDiagnosisUseCase(diagnostics);
  });

  it('moves a STARTED diagnostic to WITH_CONSENT and saves it', async () => {
    diagnostics.findById.mockResolvedValueOnce(diagnosisIn('STARTED'));

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    expect(result.ok).toBe(true);
    expect(diagnostics.save).toHaveBeenCalledTimes(1);
    expect(diagnostics.save.mock.calls[0][0].state.value).toBe('WITH_CONSENT');
  });

  it.each([
    'WITH_CONSENT',
    'WITH_INITIATIVE',
    'QUESTIONNAIRE_IN_PROGRESS',
    'PROFILE_GENERATED',
    'DEEP_ANALYSIS_IN_PROGRESS',
  ])('leaves a diagnostic already in %s untouched and succeeds', async (state) => {
    diagnostics.findById.mockResolvedValueOnce(diagnosisIn(state));

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    expect(result.ok).toBe(true);
    expect(diagnostics.save).not.toHaveBeenCalled();
  });

  it('returns NotFoundError when the diagnostic does not exist', async () => {
    diagnostics.findById.mockResolvedValueOnce(null);

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(NotFoundError);
    expect(diagnostics.save).not.toHaveBeenCalled();
  });
});
