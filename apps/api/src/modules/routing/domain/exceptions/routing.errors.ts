import { DomainError } from '../../../../shared/kernel/domain/errors/domain-error.js';

/**
 * Stable codes of the routing module. The frontend and the tests match on
 * `code`, never on the message.
 *
 * The HTTP mapping lives in `DomainExceptionFilter`; any subclass not
 * registered there falls back to the default 400.
 */

/** No routing configuration has been seeded. */
export class NoActiveConfigurationError extends DomainError {
  override readonly code = 'ROUTING_NO_ACTIVE_CONFIGURATION';

  constructor(details?: Record<string, unknown>) {
    super(
      'No hay una versión de configuración de enrutamiento vigente. ' +
        'Publique una versión antes de generar recommendations.',
    );
    this.details = details;
  }

  readonly details?: Record<string, unknown>;
}

/** The diagnostic exists but has no computed maturity profile yet. */
export class ProfileNotComputedError extends DomainError {
  override readonly code = 'ROUTING_PROFILE_NOT_COMPUTED';

  constructor(public readonly diagnosticId: string) {
    super(
      `El diagnóstico ${diagnosticId} no tiene un perfil de madurez calculado; ` +
        'no es posible enrutarlo al portafolio.',
    );
  }
}

/** The recommendation of a diagnostic that does not have one yet was requested. */
export class RecommendationNotGeneratedError extends DomainError {
  override readonly code = 'ROUTING_RECOMMENDATION_NOT_GENERATED';

  constructor(public readonly diagnosticId: string) {
    super(
      `El diagnóstico ${diagnosticId} todavía no tiene recomendación de portafolio generada.`,
    );
  }
}

/**
 * A predicate does not compile: unknown field, operator not allowed in the
 * mode, or malformed shape. Thrown when configuring, not when evaluating.
 */
export class PredicateCompilationError extends DomainError {
  override readonly code = 'ROUTING_PREDICATE_COMPILATION_FAILED';

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** The ordinal scale does not respect the strict order of its steps. */
export class CalibrationNotMonotonicError extends DomainError {
  override readonly code = 'ROUTING_CALIBRATION_NOT_MONOTONIC';

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
