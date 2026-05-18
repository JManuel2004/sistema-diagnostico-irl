/**
 * Canonical use-case shape — every application-layer use case
 * implements `execute(command)` and returns a `Promise<Result>`.
 *
 * Convention (CLAUDE.api.md §"Use case shape"):
 *   - Single public method named `execute`.
 *   - One command/query DTO in, one result out.
 *   - Constructor injection only — ports as symbols, never concretes.
 *   - Domain errors are thrown raw; the global `DomainExceptionFilter`
 *     translates them. Use cases never throw `HttpException`.
 *
 * Phase-1 use cases use `Promise<Result>` directly; using the
 * `Result<T, E>` discriminated union (`shared-kernel/domain/result.ts`)
 * is also valid when the error path is part of the public contract
 * rather than exceptional.
 */
export interface UseCase<TCommand, TResult> {
  execute(command: TCommand): Promise<TResult>;
}

/**
 * Synonym for a query use case — semantically distinct from a write
 * operation even though the shape is identical. Use `Query` when the
 * implementation must be side-effect-free (CQRS).
 */
export interface Query<TParams, TResult> {
  execute(params: TParams): Promise<TResult>;
}
