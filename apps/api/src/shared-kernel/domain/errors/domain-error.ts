/**
 * Base class for every error originating in the domain or application layers.
 *
 * The global `DomainExceptionFilter` translates subclasses into RFC 7807
 * problem-detail HTTP responses. Domain code never throws `HttpException`.
 *
 * Subclasses MUST set a stable `code` field — this is what callers (frontend,
 * tests, external integrations) match on, not the human-readable message.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}
