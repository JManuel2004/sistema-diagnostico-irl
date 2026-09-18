import type { DomainError } from '../domain/errors/domain-error.js';
import type { Result } from '../domain/result.js';

/**
 * `presentation/`'s single, explicit point of `Result` → HTTP translation.
 *
 * On `Result.err`, throws the wrapped `DomainError` for
 * `DomainExceptionFilter` to map to the correct HTTP response — reusing
 * its existing per-subtype mapping (`NotFoundError` → 404,
 * `ConflictError` → 409, …) instead of duplicating that table at every
 * controller call site. `DomainExceptionFilter` itself is unaffected:
 * from its perspective this is the same thrown `DomainError` it has
 * always caught, just thrown one level higher now that the use case
 * returns it as data instead of raising it.
 */
export function unwrapResult<T>(result: Result<T, DomainError>): T {
  if (!result.ok) throw result.error;
  return result.value;
}
