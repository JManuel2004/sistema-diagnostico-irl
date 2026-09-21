import type { UserContext } from '../../domain/entities/user-context.vo.js';
import type { UserContextCachePort } from '../../domain/repositories/user-context.cache.port.js';
import type { UserContextPort } from '../../domain/repositories/user-context.repository.port.js';

export interface ResolveUserContextQuery {
  readonly userId: string;
  /** Skips the cache and refreshes it with a fresh read from Core. */
  readonly forceRefresh?: boolean;
}

/**
 * Resolves the INNLAB Core context (company, role, memberships) for an
 * already-authenticated user.
 *
 * The JWT proves *who* the user is; it says nothing about which company
 * they act for. That answer only exists in Core, so this use case is the
 * single place the rest of the API asks for it.
 *
 * Deliberately framework-free (no `@Injectable`): the application layer
 * may not import `@nestjs/common` (enforced by `no-restricted-imports`
 * in `eslint.config.mjs`). `IdentityModule` wires it with a factory
 * provider instead.
 *
 * Not converted to `Result<T, E>` during that adoption
 * (`convenciones-objetivo.md` §2): this use case has no business-outcome
 * check of its own — its only failure path is whatever `UserContextPort`
 * throws when INNLAB Core is unreachable or does not know the user,
 * which is an infrastructure failure, not an anticipable outcome of this
 * use case's own logic. It is left to propagate unwrapped, same as
 * before.
 */
export class ResolveUserContextUseCase {
  constructor(
    private readonly userContext: UserContextPort,
    private readonly cache: UserContextCachePort,
  ) {}

  async execute(query: ResolveUserContextQuery): Promise<UserContext> {
    if (query.forceRefresh !== true) {
      const cached = await this.cache.get(query.userId);
      if (cached !== null) {
        return cached;
      }
    }

    const fresh = await this.userContext.getUserContext(query.userId);
    await this.cache.set(query.userId, fresh);
    return fresh;
  }
}
