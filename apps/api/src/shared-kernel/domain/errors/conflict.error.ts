import { DomainError } from './domain-error.js';

/**
 * Thrown when an operation conflicts with current state — typically a
 * concurrent modification or an attempt to create a duplicate aggregate.
 *
 * Maps to HTTP 409 Conflict.
 */
export class ConflictError extends DomainError {
  override readonly code = 'CONFLICT';

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
