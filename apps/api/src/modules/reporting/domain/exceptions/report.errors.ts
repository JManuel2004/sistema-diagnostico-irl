import { DomainError } from '../../../../shared/kernel/domain/errors/domain-error.js';

/**
 * The full report of a diagnostic whose deep analysis is not complete was
 * requested (RF-16): the report gathers the results of the deep analysis,
 * so it does not exist before both are saved.
 *
 * Maps to **409** (`DomainExceptionFilter`, by code): the diagnostic exists
 * but is not in the state the read needs — the same precedent as
 * `RoadmapNotGeneratedError`.
 */
export class ReportNotAvailableError extends DomainError {
  override readonly code = 'REPORT_NOT_AVAILABLE';

  constructor(public readonly diagnosticId: string) {
    super(
      'El reporte completo solo está disponible después de completar el análisis profundo.',
    );
  }
}
