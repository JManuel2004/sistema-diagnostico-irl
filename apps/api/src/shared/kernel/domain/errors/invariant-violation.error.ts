import { DomainError } from './domain-error.js';

/**
 * Thrown when a domain invariant is violated — typically when constructing
 * a value object or aggregate with input that does not satisfy its contract
 * (e.g. `LikertValue.create(6)`, `IrlLevel.create(0)`).
 *
 * Maps to HTTP 422 Unprocessable Entity.
 */
export class InvariantViolationError extends DomainError {
  override readonly code = 'INVARIANT_VIOLATION';

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
