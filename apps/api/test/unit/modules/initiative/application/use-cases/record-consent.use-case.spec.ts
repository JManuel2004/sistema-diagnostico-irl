import { jest } from '@jest/globals';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import {
  RecordConsentUseCase,
  CURRENT_TERMS_VERSION,
} from '../../../../../../src/modules/initiative/application/use-cases/record-consent.use-case.js';
import type { ConsentRepositoryPort } from '../../../../../../src/modules/initiative/domain/repositories/consent.repository.port.js';
import type { DiagnosticOwnershipPort } from '../../../../../../src/modules/initiative/domain/repositories/diagnostic-ownership.port.js';
import { ConsentRecordedEvent } from '../../../../../../src/shared/kernel/events/consent-recorded.event.js';
import { ConflictError } from '../../../../../../src/shared/kernel/domain/errors/conflict.error.js';
import { ForbiddenError } from '../../../../../../src/shared/kernel/domain/errors/forbidden.error.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../../../src/shared/kernel/domain/result.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const USER_ID = 'user-1';

describe('RecordConsentUseCase', () => {
  let consents: jest.Mocked<ConsentRepositoryPort>;
  let verify: jest.Mock<DiagnosticOwnershipPort['verify']>;
  let emitAsync: jest.Mock<(...args: unknown[]) => Promise<unknown[]>>;
  let useCase: RecordConsentUseCase;

  const command = {
    diagnosticId: DIAGNOSTIC_ID,
    cognitoUserId: USER_ID,
    version: CURRENT_TERMS_VERSION,
  };

  beforeEach(() => {
    consents = {
      findByDiagnosticId: jest.fn(),
      save: jest.fn(() => Promise.resolve(undefined)),
    };
    verify = jest.fn(() => Promise.resolve(Result.ok(undefined)));
    emitAsync = jest.fn(() => Promise.resolve([]));
    useCase = new RecordConsentUseCase(consents, { verify }, {
      emitAsync,
    } as unknown as EventEmitter2);
  });

  it('saves the consent and publishes ConsentRecordedEvent after saving', async () => {
    const result = await useCase.execute(command);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.value.diagnosticId).toBe(DIAGNOSTIC_ID);
    expect(result.value.version).toBe(CURRENT_TERMS_VERSION);

    expect(verify).toHaveBeenCalledWith(DIAGNOSTIC_ID, USER_ID);
    expect(consents.save).toHaveBeenCalledTimes(1);

    const [name, event] = emitAsync.mock.calls[0] as [string, ConsentRecordedEvent];
    expect(name).toBe(ConsentRecordedEvent.eventName);
    expect(event.payload).toEqual({ diagnosticId: DIAGNOSTIC_ID });
    expect(consents.save.mock.invocationCallOrder[0]).toBeLessThan(
      emitAsync.mock.invocationCallOrder[0],
    );
  });

  it.each([
    ['NotFoundError', new NotFoundError('Diagnosis', DIAGNOSTIC_ID)],
    ['ForbiddenError', new ForbiddenError('not yours')],
  ])('returns %s and writes nothing when the ownership check fails', async (_label, error) => {
    verify.mockResolvedValueOnce(Result.err(error));

    const result = await useCase.execute(command);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBe(error);
    expect(consents.save).not.toHaveBeenCalled();
    expect(emitAsync).not.toHaveBeenCalled();
  });

  it('checks ownership before the terms version', async () => {
    verify.mockResolvedValueOnce(Result.err(new ForbiddenError('not yours')));

    const result = await useCase.execute({ ...command, version: 'v0-stale' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(ForbiddenError);
  });

  it('rejects a stale terms version with ConflictError, saving and publishing nothing', async () => {
    const result = await useCase.execute({ ...command, version: 'v0-stale' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(ConflictError);
    expect(consents.save).not.toHaveBeenCalled();
    expect(emitAsync).not.toHaveBeenCalled();
  });
});
