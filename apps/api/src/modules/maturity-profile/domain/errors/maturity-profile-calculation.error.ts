import { DomainError } from '../../../../shared-kernel/domain/errors/domain-error.js';

/**
 * Thrown when the IRL maturity profile cannot be computed for reasons that
 * are NOT user input errors:
 *   - The conversion table is incomplete or missing (a calculated average
 *     falls outside any range).
 *   - The persisted answers are inconsistent (e.g. a dimension has fewer
 *     than 8 answers when the questionnaire is supposed to be complete).
 *   - A repository write fails mid-transaction.
 *
 * Maps to HTTP 500 Internal Server Error via `DomainExceptionFilter`.
 *
 * Acceptance criterion of DIAGIRL-34 ("Obtener niveles IRL por dimensión",
 * error scenario): *"informa al usuario que no fue posible generar el
 * diagnóstico y no guarda resultados parciales ni muestra un perfil
 * incompleto"*. This error is raised BEFORE any partial write reaches the
 * database — the calculator builds the aggregate whole or not at all, and
 * the repository wraps the persist in a transaction.
 */
export class MaturityProfileCalculationError extends DomainError {
  override readonly code = 'MATURITY_PROFILE_CALCULATION_FAILED';

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}
