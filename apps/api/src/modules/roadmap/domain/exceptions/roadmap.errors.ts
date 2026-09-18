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
