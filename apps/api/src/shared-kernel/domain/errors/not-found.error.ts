import { DomainError } from './domain-error.js';

/**
 * Thrown when a required aggregate is not found in its repository.
 *
 * Maps to HTTP 404 Not Found.
 */
export class NotFoundError extends DomainError {
  override readonly code = 'NOT_FOUND';

  constructor(
    public readonly resource: string,
    public readonly identifier?: string,
  ) {
    super(
      identifier !== undefined
        ? `${resource} '${identifier}' not found`
        : `${resource} not found`,
    );
  }
}
