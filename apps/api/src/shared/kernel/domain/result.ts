import type { DomainError } from './errors/domain-error.js';

/**
 * A discriminated union for operations that may fail with a domain error.
 *
 * Use cases may either throw `DomainError` subclasses or return a `Result`.
 * Prefer `Result` when callers must reason about both branches without
 * a `try/catch`; throw when the error is exceptional rather than a
 * routine outcome.
 */
export type Result<T, E extends DomainError = DomainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  },
  err<E extends DomainError>(error: E): Result<never, E> {
    return { ok: false, error };
  },
} as const;
