import { jest } from '@jest/globals';
import { RegisterInitiativeUseCase } from '../../../../../../src/modules/initiative/application/use-cases/register-initiative.use-case.js';
import type { InitiativeRepositoryPort } from '../../../../../../src/modules/initiative/domain/repositories/initiative.repository.port.js';
import type { InitiativeCatalogPort } from '../../../../../../src/modules/initiative/domain/repositories/initiative-catalog.port.js';
import type { DiagnosticOwnershipPort } from '../../../../../../src/modules/initiative/domain/repositories/diagnostic-ownership.port.js';
import { ForbiddenError } from '../../../../../../src/shared/kernel/domain/errors/forbidden.error.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../../../src/shared/kernel/domain/result.js';

const DIAGNOSTIC_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const USER_ID = 'user-1';

describe('RegisterInitiativeUseCase', () => {
  let initiatives: jest.Mocked<InitiativeRepositoryPort>;
  let catalog: jest.Mocked<InitiativeCatalogPort>;
  let verify: jest.Mock<DiagnosticOwnershipPort['verify']>;
  let useCase: RegisterInitiativeUseCase;

  const command = {
    diagnosticId: DIAGNOSTIC_ID,
    userId: USER_ID,
    sectorId: '7',
    name: 'AgroConecta',
    shortDescription: 'Coffee traceability platform',
  };

  beforeEach(() => {
    initiatives = {
      findByDiagnosticId: jest.fn(),
      save: jest.fn(() => Promise.resolve(undefined)),
    };
    catalog = {
      findAllSectors: jest.fn(),
      findSectorById: jest.fn(() =>
        Promise.resolve({ id: '7', name: 'Agroindustria' }),
      ),
      findAllStages: jest.fn(),
      findStageById: jest.fn(),
      findStageByCode: jest.fn(),
    };
    verify = jest.fn(() => Promise.resolve(Result.ok(undefined)));
    useCase = new RegisterInitiativeUseCase(initiatives, catalog, { verify });
  });

  it('registers the initiative when the caller owns the diagnostic', async () => {
    const result = await useCase.execute(command);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected ok result');
    expect(result.value.diagnosticId).toBe(DIAGNOSTIC_ID);
    expect(result.value.sector).toEqual({ id: '7', name: 'Agroindustria' });
    expect(verify).toHaveBeenCalledWith(DIAGNOSTIC_ID, USER_ID);
    expect(initiatives.save).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['NotFoundError', new NotFoundError('Diagnosis', DIAGNOSTIC_ID)],
    ['ForbiddenError', new ForbiddenError('not yours')],
  ])(
    'returns %s and writes nothing when the ownership check fails',
    async (_label, error) => {
      verify.mockResolvedValueOnce(Result.err(error));

      const result = await useCase.execute(command);

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected err result');
      expect(result.error).toBe(error);
      expect(initiatives.save).not.toHaveBeenCalled();
      // Ownership is checked before the catalog is even consulted.
      expect(catalog.findSectorById).not.toHaveBeenCalled();
    },
  );

  it('returns NotFoundError for an unknown sector', async () => {
    catalog.findSectorById.mockResolvedValueOnce(null);

    const result = await useCase.execute(command);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected err result');
    expect(result.error).toBeInstanceOf(NotFoundError);
    expect(initiatives.save).not.toHaveBeenCalled();
  });
});
