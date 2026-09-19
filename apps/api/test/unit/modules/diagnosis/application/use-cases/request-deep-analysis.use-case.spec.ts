import { jest } from '@jest/globals';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { RequestDeepAnalysisUseCase } from '../../../../../../src/modules/diagnosis/application/use-cases/request-deep-analysis.use-case.js';
import type { DiagnosisRepositoryPort } from '../../../../../../src/modules/diagnosis/domain/repositories/diagnosis.repository.port.js';
import { Diagnosis } from '../../../../../../src/modules/diagnosis/domain/entities/diagnosis.aggregate.js';
import { DeepAnalysisRequestedEvent } from '../../../../../../src/shared/kernel/events/deep-analysis-requested.event.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';
import { ConflictError } from '../../../../../../src/shared/kernel/domain/errors/conflict.error.js';

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

describe('RequestDeepAnalysisUseCase', () => {
  let diagnostics: jest.Mocked<DiagnosisRepositoryPort>;
  let emitAsync: jest.Mock<(...args: unknown[]) => Promise<unknown[]>>;
  let useCase: RequestDeepAnalysisUseCase;

  beforeEach(() => {
    diagnostics = {
      findById: jest.fn(),
      findLatestByUserId: jest.fn(),
      findAllByUserId: jest.fn(),
      save: jest.fn(() => Promise.resolve(undefined)),
    };
    emitAsync = jest.fn(() => Promise.resolve([]));
    useCase = new RequestDeepAnalysisUseCase(diagnostics, {
      emitAsync,
    } as unknown as EventEmitter2);
  });

  it('transitions PROFILE_GENERATED to DEEP_ANALYSIS_IN_PROGRESS and publishes the event after saving', async () => {
    diagnostics.findById.mockResolvedValueOnce(diagnosisIn('PROFILE_GENERATED'));

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.value).toEqual({
      diagnosticId: DIAGNOSTIC_ID,
      state: 'DEEP_ANALYSIS_IN_PROGRESS',
    });
    expect(diagnostics.save.mock.calls[0][0].state.value).toBe(
      'DEEP_ANALYSIS_IN_PROGRESS',
    );

    expect(emitAsync).toHaveBeenCalledTimes(1);
    const [name, event] = emitAsync.mock.calls[0] as [
      string,
      DeepAnalysisRequestedEvent,
    ];
    expect(name).toBe(DeepAnalysisRequestedEvent.eventName);
    expect(event).toBeInstanceOf(DeepAnalysisRequestedEvent);
    expect(event.payload).toEqual({ diagnosticId: DIAGNOSTIC_ID });

    // The event fires only once the transition it represents is saved.
    expect(diagnostics.save.mock.invocationCallOrder[0]).toBeLessThan(
      emitAsync.mock.invocationCallOrder[0],
    );
  });

  it.each(['DEEP_ANALYSIS_IN_PROGRESS', 'DEEP_ANALYSIS_COMPLETE'])(
    'when already %s: keeps the state without saving, but re-publishes so a failed calculation can be retried',
    async (state) => {
      diagnostics.findById.mockResolvedValueOnce(diagnosisIn(state));

      const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected ok result');
      expect(result.value.state).toBe(state);
      expect(diagnostics.save).not.toHaveBeenCalled();
      expect(emitAsync).toHaveBeenCalledTimes(1);
    },
  );

  it.each(['STARTED', 'QUESTIONNAIRE_COMPLETE', 'DEEP_ANALYSIS_DECLINED'])(
    'returns a ConflictError when requested from %s',
    async (state) => {
      diagnostics.findById.mockResolvedValueOnce(diagnosisIn(state));

      const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected err result');
      expect(result.error).toBeInstanceOf(ConflictError);
      expect(diagnostics.save).not.toHaveBeenCalled();
      expect(emitAsync).not.toHaveBeenCalled();
    },
  );

  it('returns a NotFoundError when the diagnostic does not exist', async () => {
    diagnostics.findById.mockResolvedValueOnce(null);

    const result = await useCase.execute({ diagnosticId: DIAGNOSTIC_ID });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(NotFoundError);
    expect(emitAsync).not.toHaveBeenCalled();
  });
});
