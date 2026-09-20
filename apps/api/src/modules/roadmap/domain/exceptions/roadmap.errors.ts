import { DomainError } from '../../../../shared/kernel/domain/errors/domain-error.js';

/**
 * Failure while building the scaling roadmap.
 *
 * Maps to **500**, not the default 400 of `DomainError`: the possible
 * causes — a cyclic graph, incomplete minimums, inconsistent levels —
 * are all system configuration defects, not request defects. A 4xx would
 * tell the user they got it wrong.
 *
 * Identical precedent: `MaturityProfileCalculationError → 500`.
 */
export class RoadmapCalculationError extends DomainError {
  override readonly code: string = 'ROADMAP_CALCULATION_FAILED';

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/**
 * The dependency graph contains a cycle and therefore admits no
 * topological order.
 *
 * The message names the dimensions involved. A generic 500 in the face
 * of a badly declared graph would be exactly the silent failure this
 * module has to avoid: whoever receives the error needs to know which
 * edges to review, not just that something failed.
 */
export class DependencyGraphCycleError extends RoadmapCalculationError {
  override readonly code = 'ROADMAP_GRAPH_HAS_CYCLE';

  constructor(public readonly dimensionesImplicadas: readonly string[]) {
    super(
      `El graph de dependencies contiene un ciclo entre las dimensions ` +
        `${[...dimensionesImplicadas].sort().join(', ')}; no admite un orden de fases. ` +
        `Revise las edges declaradas entre ellas.`,
      { dimensionesImplicadas: [...dimensionesImplicadas].sort() },
    );
  }
}

/**
 * The roadmap of a diagnostic was requested before the user accepted the
 * deep analysis, which is what calculates and saves it.
 *
 * Maps to **409**: the diagnostic exists but is not in the state the read
 * needs. It is the expected initial state, not a failure — the same
 * precedent as `RecommendationNotGeneratedError`.
 */
export class RoadmapNotGeneratedError extends DomainError {
  override readonly code = 'ROADMAP_NOT_GENERATED';

  constructor(public readonly diagnosticId: string) {
    super(
      `El diagnóstico ${diagnosticId} todavía no tiene roadmap de escalamiento generado.`,
    );
  }
}
