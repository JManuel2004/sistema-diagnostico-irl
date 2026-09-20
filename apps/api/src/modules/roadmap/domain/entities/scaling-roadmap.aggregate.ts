import {
  DIMENSION_CODES,
  type DimensionCode,
  type RoadmapInclusionReason,
} from '@innlab/contracts';
import type { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { RoadmapCalculationError } from '../exceptions/roadmap.errors.js';

/**
 * A dimension inside a phase: where it stands, where it has to get to,
 * and what it unblocks by doing so.
 *
 * `enables` is the readable justification of why this dimension belongs
 * in this phase and not later. Being readable is deliberate: it is the
 * only thing that lets a consultant **refute** the proposed order. The
 * system can validate that the graph is acyclic, but not that its edges
 * are true; exposing the why is what turns a methodological claim into
 * something arguable instead of a black box.
 */
export interface RoadmapDimensionTarget {
  readonly dimensionCode: DimensionCode;
  readonly currentLevel: number;
  readonly targetLevel: number;
  readonly enables: readonly DimensionCode[];
  /** Why the dimension is in the roadmap at all. */
  readonly inclusionReason: RoadmapInclusionReason;
  /** The level the dimension is expected to reach on its own account. */
  readonly expectedMinimum: number;
  /**
   * The dimension of the roadmap whose requirement sets `targetLevel`, when
   * that requirement is above `expectedMinimum`; `null` when the target is
   * simply the expected minimum.
   */
  readonly targetDrivenBy: DimensionCode | null;
}

/**
 * A roadmap phase. Dimensions in the same phase do not depend on each
 * other and are worked on **in parallel**.
 */
export interface RoadmapPhase {
  readonly order: number;
  readonly dimensions: readonly RoadmapDimensionTarget[];
}

/**
 * `ScalingRoadmap` — aggregate root of the scaling roadmap (RF-14).
 *
 * Covers **only the dimensions that need work**, not all six. This
 * contradicts the letter of RF-14, which asks for "exactly six blocks,
 * one per dimension": the dependency approach is incompatible with that
 * wording and the SRS will have to be updated.
 * `dimensionsWithoutIntervention` partly mitigates the mismatch by
 * making explicit that all six were considered and why three were left
 * out — without it, a missing dimension would read as an oversight.
 *
 * An empty roadmap is a valid result: it means the initiative meets the
 * minimum everywhere. It is not an error.
 */
export class ScalingRoadmap {
  private constructor(
    public readonly diagnosticId: Uuid,
    public readonly phases: readonly RoadmapPhase[],
    public readonly dimensionsWithoutIntervention: readonly DimensionCode[],
    public readonly generatedAt: Date,
  ) {}

  static create(input: {
    diagnosticId: Uuid;
    phases: readonly RoadmapPhase[];
    generatedAt: Date;
  }): ScalingRoadmap {
    const intervenidas = new Set<DimensionCode>();
    for (const fase of input.phases) {
      for (const d of fase.dimensions) {
        if (intervenidas.has(d.dimensionCode)) {
          throw new RoadmapCalculationError(
            `La dimensión '${d.dimensionCode}' aparece en más de una fase del roadmap`,
            { dimension: d.dimensionCode },
          );
        }
        intervenidas.add(d.dimensionCode);

        if (d.targetLevel <= d.currentLevel) {
          // If a dimension entered the roadmap it is because something
          // demands it above where it stands. A target that does not
          // exceed the current level means the closure pulled in a
          // dimension that did not need it.
          throw new RoadmapCalculationError(
            `La meta de '${d.dimensionCode}' (${d.targetLevel}) no supera su nivel actual ` +
              `(${d.currentLevel}); no habría nada que hacer en esa fase`,
            {
              dimension: d.dimensionCode,
              nivelActual: d.currentLevel,
              nivelMeta: d.targetLevel,
            },
          );
        }
      }
    }

    const ordenes = input.phases.map((f) => f.order);
    const esperado = ordenes.map((_, i) => i + 1);
    if (ordenes.join(',') !== esperado.join(',')) {
      throw new RoadmapCalculationError(
        `Las fases deben numerarse consecutivamente desde 1; se recibió [${ordenes.join(', ')}]`,
        { ordenes },
      );
    }

    return new ScalingRoadmap(
      input.diagnosticId,
      input.phases,
      DIMENSION_CODES.filter((c) => !intervenidas.has(c)),
      input.generatedAt,
    );
  }

  /** Un perfil que cumple el mínimo en las seis dimensions. */
  isEmpty(): boolean {
    return this.phases.length === 0;
  }
}
