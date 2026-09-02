import type { UserContext } from '../entities/user-context.vo.js';

/**
 * Cache port for `UserContext`.
 *
 * Core is called once per user per TTL rather than once per request:
 * every authenticated endpoint that needs a `companyId` would otherwise
 * add a network hop to Core. Kept behind a port so the use case stays
 * synchronously testable with an in-memory double.
 */
export const USER_CONTEXT_CACHE = Symbol('USER_CONTEXT_CACHE');

export interface UserContextCachePort {
  get(userId: string): Promise<UserContext | null>;
  set(userId: string, context: UserContext): Promise<void>;
  invalidate(userId: string): Promise<void>;
}
