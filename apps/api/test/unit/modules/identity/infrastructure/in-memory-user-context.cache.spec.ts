import { jest } from '@jest/globals';
import {
  InMemoryUserContextCache,
  USER_CONTEXT_TTL_MS,
} from '../../../../../src/modules/identity/infrastructure/cache/in-memory-user-context.cache.js';
import type { UserContext } from '../../../../../src/modules/identity/domain/entities/user-context.vo.js';

const USER_ID = 'e1f2a3b4-5c6d-4e7f-8a9b-0c1d2e3f4a5b';

const CONTEXT: UserContext = {
  userId: USER_ID,
  email: 'ana@icesi.edu.co',
  name: 'Ana',
  lastName: 'Ramirez',
  companyId: null,
  companyRole: null,
  workspaceId: null,
  companies: [],
};

describe('InMemoryUserContextCache', () => {
  let cache: InMemoryUserContextCache;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new InMemoryUserContextCache();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null for a user it has never seen', async () => {
    await expect(cache.get(USER_ID)).resolves.toBeNull();
  });

  it('returns a stored context while it is still fresh', async () => {
    await cache.set(USER_ID, CONTEXT);
    jest.advanceTimersByTime(USER_CONTEXT_TTL_MS - 1);

    await expect(cache.get(USER_ID)).resolves.toEqual(CONTEXT);
  });

  it('expires the context once the TTL has elapsed', async () => {
    await cache.set(USER_ID, CONTEXT);
    jest.advanceTimersByTime(USER_CONTEXT_TTL_MS);

    await expect(cache.get(USER_ID)).resolves.toBeNull();
  });

  it('drops the context on invalidate', async () => {
    await cache.set(USER_ID, CONTEXT);
    await cache.invalidate(USER_ID);

    await expect(cache.get(USER_ID)).resolves.toBeNull();
  });
});
