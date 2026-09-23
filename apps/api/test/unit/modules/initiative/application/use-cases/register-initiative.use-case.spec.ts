import { jest } from '@jest/globals';
import { initiativeSchema } from '@innlab/contracts';
import type { EventPublisher } from '../../../../../../src/shared/kernel/application/ports/event-publisher.port.js';
import { InitiativeRegisteredEvent } from '../../../../../../src/shared/kernel/events/initiative-registered.event.js';
import { RegisterInitiativeUseCase } from '../../../../../../src/modules/initiative/application/use-cases/register-initiative.use-case.js';
import type { InitiativeRepositoryPort } from '../../../../../../src/modules/initiative/domain/repositories/initiative.repository.port.js';
import type { InitiativeCatalogPort } from '../../../../../../src/modules/initiative/domain/repositories/initiative-catalog.port.js';
import type { ConsentRepositoryPort } from '../../../../../../src/modules/initiative/domain/repositories/consent.repository.port.js';
import { Consent } from '../../../../../../src/modules/initiative/domain/entities/consent.entity.js';
import { Uuid } from '../../../../../../src/shared/kernel/domain/value-objects/uuid.vo.js';
import { ConflictError } from '../../../../../../src/shared/kernel/domain/errors/conflict.error.js';
import type { DiagnosticOwnershipPort } from '../../../../../../src/modules/initiative/domain/repositories/diagnostic-ownership.port.js';
import { ForbiddenError } from '../../../../../../src/shared/kernel/domain/errors/forbidden.error.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../../../src/shared/kernel/domain/result.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const USER_ID = 'user-1';

describe('RegisterInitiativeUseCase', () => {
  let initiatives: jest.Mocked<InitiativeRepositoryPort>;
  let catalog: jest.Mocked<InitiativeCatalogPort>;
  let consents: jest.Mocked<ConsentRepositoryPort>;
  let verify: jest.Mock<DiagnosticOwnershipPort['verify']>;
  let publish: jest.Mock<EventPublisher['publish']>;
  let useCase: RegisterInitiativeUseCase;

  const command = {
    diagnosticId: DIAGNOSTIC_ID,
    userId: USER_ID,
    sectorId: '7',
    name: 'AgroConecta',
    productType: 'Aplicación web',
    stageId: '2',
    declaredStage: 'Piloto completado',
    teamSize: 3,
    teamDescription: 'Fundadora, coordinadora y desarrollador externo',
    targetMarket: 'Productores de café del suroccidente',
    currentFunding: 'Ahorros de la fundadora',
  };

  beforeEach(() => {
    initiatives = {
      findByDiagnosticId: jest.fn(),
      save: jest.fn(() => Promise.resolve(undefined)),
    };
    catalog = {
      findAllSectors: jest.fn(),
      findSectorById: jest.fn(() => Promise.resolve({ id: '7', name: 'Agroindustria' })),
      findAllStages: jest.fn(),
      findStageById: jest.fn(() =>
        Promise.resolve({ id: '2', code: 'validacion', name: 'Validación', sequence: 2 }),
      ),
      findStageByCode: jest.fn(),
    };
    consents = {
      findByDiagnosticId: jest.fn(() =>
        Promise.resolve(
          Consent.accept({
            id: Uuid.generate(),
            diagnosticId: Uuid.create(DIAGNOSTIC_ID),
            cognitoUserId: USER_ID,
            termsVersion: 'v1',
          }),
        ),
      ),
      save: jest.fn(() => Promise.resolve(undefined)),
    };
    verify = jest.fn(() => Promise.resolve(Result.ok(undefined)));
    publish = jest.fn<EventPublisher['publish']>().mockResolvedValue();
    useCase = new RegisterInitiativeUseCase(initiatives, catalog, consents, { verify }, {
      publish,
    });
  });

  it('registers the initiative when the caller owns the diagnostic', async () => {
    const result = await useCase.execute(command);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.value.diagnosticId).toBe(DIAGNOSTIC_ID);
    expect(result.value.sector).toEqual({ id: '7', name: 'Agroindustria' });
    expect(result.value.stage).toEqual({ id: '2', code: 'validacion', name: 'Validación' });
    expect(() => initiativeSchema.parse(result.value)).not.toThrow();
    expect(verify).toHaveBeenCalledWith(DIAGNOSTIC_ID, USER_ID);
    expect(initiatives.save).toHaveBeenCalledTimes(1);
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
    expect(initiatives.save).not.toHaveBeenCalled();
    // Ownership is checked before the catalog is even consulted.
    expect(catalog.findSectorById).not.toHaveBeenCalled();
  });

  // RF-03 / RNF-06: no initiative data is stored before the consent.
  it('returns ConflictError and writes nothing when the consent is not recorded', async () => {
    consents.findByDiagnosticId.mockResolvedValueOnce(null);

    const result = await useCase.execute(command);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(ConflictError);
    expect(initiatives.save).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
    expect(consents.findByDiagnosticId).toHaveBeenCalledWith(DIAGNOSTIC_ID);
  });

  it('checks ownership before the consent', async () => {
    verify.mockResolvedValueOnce(Result.err(new ForbiddenError('not yours')));

    await useCase.execute(command);

    expect(consents.findByDiagnosticId).not.toHaveBeenCalled();
  });

  it('returns NotFoundError for an unknown sector', async () => {
    catalog.findSectorById.mockResolvedValueOnce(null);

    const result = await useCase.execute(command);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(NotFoundError);
    expect(initiatives.save).not.toHaveBeenCalled();
  });

  it('returns NotFoundError for an unknown stage and writes nothing', async () => {
    catalog.findStageById.mockResolvedValueOnce(null);

    const result = await useCase.execute(command);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(NotFoundError);
    expect(initiatives.save).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  // Registering the initiative moves the diagnostic on, through the
  // event `diagnosis/` listens to.
  it('publishes InitiativeRegisteredEvent once the initiative is saved', async () => {
    await useCase.execute(command);

    expect(publish).toHaveBeenCalledTimes(1);
    const [event] = publish.mock.calls[0] as [InitiativeRegisteredEvent];
    expect(event.name).toBe(InitiativeRegisteredEvent.eventName);
    expect(event.payload).toEqual({ diagnosticId: DIAGNOSTIC_ID });
    expect(initiatives.save.mock.invocationCallOrder[0]).toBeLessThan(
      publish.mock.invocationCallOrder[0],
    );
  });

  it('publishes nothing when the ownership check fails', async () => {
    verify.mockResolvedValueOnce(Result.err(new NotFoundError('Diagnosis', DIAGNOSTIC_ID)));

    await useCase.execute(command);

    expect(publish).not.toHaveBeenCalled();
  });
});
