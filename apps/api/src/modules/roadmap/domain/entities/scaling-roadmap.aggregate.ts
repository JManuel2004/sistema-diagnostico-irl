import {
  DIMENSION_CODES,
  type DimensionCode,
  type PhaseServiceTrace,
  type RoadmapInclusionReason,
  type RoadmapTargetReason,
} from '@innlab/contracts';
import type { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { RoadmapCalculationError } from '../exceptions/roadmap.errors.js';

/**
 * A dimension inside a phase: where it stands when the phase starts, where
 * the phase takes it, where the route takes it in the end, and what it
 * unblocks by doing so.
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
  /** Level when the phase starts. */
  readonly currentLevel: number;
  /** Level by the end of this phase. */
  readonly targetLevel: number;
  /** Level at the end of the route; a rise above the per-phase limit spans phases. */
  readonly finalTargetLevel: number;
  readonly enables: readonly DimensionCode[];
  /** Why the dimension is in the roadmap at all. */
  readonly inclusionReason: RoadmapInclusionReason;
  /** The level the dimension is expected to reach on its own account. */
  readonly expectedMinimum: number;
  /** What sets `finalTargetLevel`. */
  readonly targetReason: RoadmapTargetReason;
  /**
   * The dimension that sets `finalTargetLevel` — a dependent that needs it
   * higher, or the paired dimension it keeps up with; `null` when the
   * target is simply the expected minimum.
   */
  readonly targetDrivenBy: DimensionCode | null;
}

/**
 * The service a phase proposes, as calculated: a copy, so the phase keeps
 * saying what was proposed even if the catalog changes later (its card is
 * read live when the roadmap is served).
 */
export interface PhaseServiceSnapshot {
  readonly idService: number;
  readonly name: string;
  readonly tierOrder: number;
  /** No service reached the phase's minimum: the best available one. */
  readonly approximate: boolean;
}

/**
 * A roadmap phase. Dimensions in the same phase do not depend on each
 * other and are worked on **in parallel**; the phase proposes a service of
 * the portfolio to do it, with the trace of how it was chosen.
 */
export interface RoadmapPhase {
  readonly order: number;
  readonly dimensions: readonly RoadmapDimensionTarget[];
  readonly service: PhaseServiceSnapshot | null;
  readonly serviceTrace: PhaseServiceTrace;
}

/**
 * `ScalingRoadmap` — aggregate root of the scaling roadmap (RF-14).
 *
 * Covers **only the dimensions that need work**, not all six. This
 * contradicts the letter of RF-14, which asks for "exactly six blocks,
 * one per dimension": the dependency approach is incompatible with that
 * wording and the SRS will have to be updated.
 * `dimensionsWithoutIntervention` partly mitigates the mismatch by
 * making explicit that all six were considered and why some were left
 * out — without it, a missing dimension would read as an oversight.
 *
 * `finalLevels` is the profile projected to the end of the route, and
 * `balanced` says whether it leaves no imbalance with an alert.
 *
 * An empty roadmap is a valid result: it means the initiative meets the
 * minimum everywhere and is balanced. It is not an error.
 */
export class ScalingRoadmap {
  private constructor(
    public readonly diagnosticId: Uuid,
    public readonly phases: readonly RoadmapPhase[],
    public readonly dimensionsWithoutIntervention: readonly DimensionCode[],
    public readonly finalLevels: Readonly<Record<DimensionCode, number>>,
    public readonly balanced: boolean,
    public readonly generatedAt: Date,
  ) {}

  static create(input: {
    diagnosticId: Uuid;
    phases: readonly RoadmapPhase[];
    finalLevels: Readonly<Record<DimensionCode, number>>;
    balanced: boolean;
    generatedAt: Date;
  }): ScalingRoadmap {
    const reached = new Map<DimensionCode, number>();
    for (const phase of input.phases) {
      const inPhase = new Set<DimensionCode>();
      for (const d of phase.dimensions) {
        if (inPhase.has(d.dimensionCode)) {
          throw new RoadmapCalculationError(
            `La dimensión '${d.dimensionCode}' aparece dos veces en la fase ${String(phase.order)}`,
            { dimension: d.dimensionCode },
          );
        }
        inPhase.add(d.dimensionCode);

        if (d.targetLevel <= d.currentLevel) {
          // If a dimension is in a phase it is because the phase raises
          // it. A target that does not exceed the current level means a
          // phase with nothing to do.
          throw new RoadmapCalculationError(
            `La meta de '${d.dimensionCode}' (${d.targetLevel}) no supera su nivel actual ` +
              `(${d.currentLevel}); no habría nada que hacer en esa fase`,
            {
              dimension: d.dimensionCode,
              currentLevel: d.currentLevel,
              targetLevel: d.targetLevel,
            },
          );
        }
        const previous = reached.get(d.dimensionCode);
        if (previous !== undefined && previous !== d.currentLevel) {
          throw new RoadmapCalculationError(
            `'${d.dimensionCode}' empieza la fase ${String(phase.order)} en ${String(d.currentLevel)}, ` +
              `pero la fase anterior la dejó en ${String(previous)}`,
            { dimension: d.dimensionCode },
          );
        }
        if (d.targetLevel > d.finalTargetLevel) {
          throw new RoadmapCalculationError(
            `'${d.dimensionCode}' supera en la fase ${String(phase.order)} su meta final`,
            { dimension: d.dimensionCode },
          );
        }
        reached.set(d.dimensionCode, d.targetLevel);
      }
    }
    for (const phase of input.phases) {
      for (const d of phase.dimensions) {
        if (reached.get(d.dimensionCode) !== d.finalTargetLevel) {
          throw new RoadmapCalculationError(
            `La ruta no lleva '${d.dimensionCode}' a su meta final (${String(d.finalTargetLevel)})`,
            { dimension: d.dimensionCode },
          );
        }
      }
    }

    const orders = input.phases.map((f) => f.order);
    const expected = orders.map((_, i) => i + 1);
    if (orders.join(',') !== expected.join(',')) {
      throw new RoadmapCalculationError(
        `Las fases deben numerarse consecutivamente desde 1; se recibió [${orders.join(', ')}]`,
        { orders },
      );
    }

    return new ScalingRoadmap(
      input.diagnosticId,
      input.phases,
      DIMENSION_CODES.filter((c) => !reached.has(c)),
      input.finalLevels,
      input.balanced,
      input.generatedAt,
    );
  }

  /** A profile that meets the minimum everywhere and is balanced. */
  isEmpty(): boolean {
    return this.phases.length === 0;
  }
}
