import type { UserContext } from '../entities/user-context.vo.js';

/**
 * Outbound port for the user context that lives in INNLAB Core.
 *
 * The adapter (`InnlabCoreHttpClient`) is the only place that knows the
 * call is HTTP and that it is authenticated with a static
 * `x-internal-key` header. The application layer sees this interface.
 */
export const USER_CONTEXT_PORT = Symbol('USER_CONTEXT_PORT');

export interface UserContextPort {
  getUserContext(userId: string): Promise<UserContext>;
}
