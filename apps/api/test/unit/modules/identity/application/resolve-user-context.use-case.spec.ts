 
import { jest } from '@jest/globals';
import { ResolveUserContextUseCase } from '../../../../../src/modules/identity/usecase/resolve-user-context.use-case.js';
import type { UserContext } from '../../../../../src/modules/identity/domain/entities/user-context.vo.js';
import type { UserContextCachePort } from '../../../../../src/modules/identity/domain/ports/user-context.cache.port.js';
import type { UserContextPort } from '../../../../../src/modules/identity/domain/ports/user-context.repository.port.js';

const USER_ID = 'e1f2a3b4-5c6d-4e7f-8a9b-0c1d2e3f4a5b';

const CONTEXT: UserContext = {
  userId: USER_ID,
  email: 'ana@icesi.edu.co',
  name: 'Ana',
  lastName: 'Ramirez',
  companyId: 'c0ffee00-1111-4222-8333-444455556666',
  companyRole: 'owner',
  workspaceId: null,
  companies: [
    {
      id: 'c0ffee00-1111-4222-8333-444455556666',
      name: 'Startup Uno',
      role: 'owner',
    },
  ],
};

describe('ResolveUserContextUseCase', () => {
  let core: jest.Mocked<UserContextPort>;
  let cache: jest.Mocked<UserContextCachePort>;
  let useCase: ResolveUserContextUseCase;

  beforeEach(() => {
    core = {
      getUserContext:
        jest.fn<UserContextPort['getUserContext']>().mockResolvedValue(CONTEXT),
    };
    cache = {
      get: jest.fn<UserContextCachePort['get']>().mockResolvedValue(null),
      set: jest.fn<UserContextCachePort['set']>().mockResolvedValue(undefined),
      invalidate: jest
        .fn<UserContextCachePort['invalidate']>()
        .mockResolvedValue(undefined),
    };
    useCase = new ResolveUserContextUseCase(core, cache);
  });

  it('reads from Core and caches the result on a cache miss', async () => {
    const result = await useCase.execute({ userId: USER_ID });

    expect(result).toEqual(CONTEXT);
    expect(core.getUserContext).toHaveBeenCalledWith(USER_ID);
    expect(cache.set).toHaveBeenCalledWith(USER_ID, CONTEXT);
  });

  it('serves a cache hit without calling Core', async () => {
    cache.get.mockResolvedValue(CONTEXT);

    const result = await useCase.execute({ userId: USER_ID });

    expect(result).toEqual(CONTEXT);
    expect(core.getUserContext).not.toHaveBeenCalled();
  });

  it('bypasses a cache hit when forceRefresh is set', async () => {
    cache.get.mockResolvedValue(CONTEXT);

    await useCase.execute({ userId: USER_ID, forceRefresh: true });

    expect(cache.get).not.toHaveBeenCalled();
    expect(core.getUserContext).toHaveBeenCalledWith(USER_ID);
    expect(cache.set).toHaveBeenCalledWith(USER_ID, CONTEXT);
  });

  it('propagates a Core failure instead of returning an empty context', async () => {
    core.getUserContext.mockRejectedValue(new Error('INNLAB Core no respondio'));

    await expect(useCase.execute({ userId: USER_ID })).rejects.toThrow(
      'INNLAB Core no respondio',
    );
    expect(cache.set).not.toHaveBeenCalled();
  });
});
