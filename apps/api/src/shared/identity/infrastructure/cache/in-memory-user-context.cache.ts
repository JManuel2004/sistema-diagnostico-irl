import { Injectable } from '@nestjs/common';
import type { UserContext } from '../../domain/entities/user-context.vo.js';
import type { UserContextCachePort } from '../../domain/repositories/user-context.cache.port.js';

/** How long a resolved context is reused before Core is asked again. */
export const USER_CONTEXT_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  readonly context: UserContext;
  readonly expiresAt: number;
}

/**
 * Process-local TTL cache keyed by Cognito `sub`.
 *
 * In-memory on purpose: the value is small, per-user and cheap to rebuild,
 * and a stale company membership must not outlive a single process. The
 * TTL — not an eviction policy — is what bounds staleness; a user moved to
 * another company in Core is picked up within `USER_CONTEXT_TTL_MS`, or
 * immediately via `forceRefresh`.
 *
 * With more than one API replica each holds its own copy. That is fine at
 * this scale; a shared cache is the answer only once staleness across
 * replicas becomes observable.
 */
@Injectable()
export class InMemoryUserContextCache implements UserContextCachePort {
  private readonly entries = new Map<string, CacheEntry>();

  get(userId: string): Promise<UserContext | null> {
    const entry = this.entries.get(userId);

    if (entry === undefined) {
      return Promise.resolve(null);
    }

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(userId);
      return Promise.resolve(null);
    }

    return Promise.resolve(entry.context);
  }

  set(userId: string, context: UserContext): Promise<void> {
    this.entries.set(userId, {
      context,
      expiresAt: Date.now() + USER_CONTEXT_TTL_MS,
    });
    return Promise.resolve();
  }

  invalidate(userId: string): Promise<void> {
    this.entries.delete(userId);
    return Promise.resolve();
  }
}
