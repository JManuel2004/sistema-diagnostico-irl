import { DomainError } from './domain-error.js';

/**
 * Thrown when an authenticated user is not authorized to perform an
 * operation — distinct from authentication failure (handled by the
 * passport-jwt guard).
 *
 * Maps to HTTP 403 Forbidden.
 */
export class ForbiddenError extends DomainError {
  override readonly code = 'FORBIDDEN';

  constructor(reason: string) {
    super(reason);
  }
}
