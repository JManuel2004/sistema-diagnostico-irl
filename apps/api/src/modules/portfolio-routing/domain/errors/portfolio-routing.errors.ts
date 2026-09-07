import { DomainError } from '../../../../shared-kernel/domain/errors/domain-error.js';

/**
 * Códigos estables del módulo de enrutamiento. El frontend y las pruebas
 * hacen match sobre `code`, nunca sobre el mensaje.
 *
 * El mapeo a HTTP vive en `DomainExceptionFilter`; cualquier subclase que
 * no se registre allí cae al 400 por defecto.
 */

/** No hay ninguna versión de configuración publicada como VIGENTE. */
export class NoActiveConfigurationError extends DomainError {
  override readonly code = 'ROUTING_NO_ACTIVE_CONFIGURATION';

  constructor(details?: Record<string, unknown>) {
    super(
      'No hay una versión de configuración de enrutamiento vigente. ' +
        'Publique una versión antes de generar recomendaciones.',
    );
    this.details = details;
  }

  readonly details?: Record<string, unknown>;
}

/** El diagnóstico existe pero aún no tiene perfil de madurez calculado. */
export class ProfileNotComputedError extends DomainError {
  override readonly code = 'ROUTING_PROFILE_NOT_COMPUTED';

  constructor(public readonly diagnosticId: string) {
    super(
      `El diagnóstico ${diagnosticId} no tiene un perfil de madurez calculado; ` +
        'no es posible enrutarlo al portafolio.',
    );
  }
}

/** Se pidió la recomendación de un diagnóstico que aún no la tiene. */
export class RecommendationNotGeneratedError extends DomainError {
  override readonly code = 'ROUTING_RECOMMENDATION_NOT_GENERATED';

  constructor(public readonly diagnosticId: string) {
    super(
      `El diagnóstico ${diagnosticId} todavía no tiene recomendación de portafolio generada.`,
    );
  }
}

/**
 * Un predicado no compila: campo desconocido, operador no admitido en el
 * modo, o forma malformada. Se lanza al configurar, no al evaluar.
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

/** La escala ordinal no respeta el orden estricto de sus peldaños. */
export class CalibrationNotMonotonicError extends DomainError {
  override readonly code = 'ROUTING_CALIBRATION_NOT_MONOTONIC';

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** La configuración es incoherente en tiempo de evaluación. */
export class RoutingConfigurationError extends DomainError {
  override readonly code = 'ROUTING_CONFIGURATION_INVALID';

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
