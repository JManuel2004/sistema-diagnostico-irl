import { DIMENSION_CODES, type DimensionCode } from '@innlab/contracts';
import type { DependencyGraph } from '../value-objects/dependency-graph.vo.js';
import { DependencyGraphCycleError } from '../exceptions/roadmap.errors.js';

/** What one phase does to one dimension. */
export interface PlannedStep {
  readonly dimension: DimensionCode;
  readonly fromLevel: number;
  readonly toLevel: number;
}

/**
 * Splits the route into phases.
 *
 * A phase works, in parallel, every dimension whose enablers inside the
 * roadmap already reached their final target, and raises each by at most
 * `maxLevelsPerPhase`. A larger rise continues in the next phases. Without
 * that limit (or with a limit no rise exceeds) the phases are exactly the
 * topological layers of the roadmap: a dimension waits for its enablers
 * and finishes in one phase.
 *
 * Within a phase the dimensions follow the framework's canonical order,
 * which is not a priority. Pure domain service.
 */
export class PhasePlannerService {
  plan(
    levels: ReadonlyMap<DimensionCode, number>,
    targets: ReadonlyMap<DimensionCode, number>,
    graph: DependencyGraph,
    maxLevelsPerPhase: number,
  ): PlannedStep[][] {
    const current = new Map(levels);
    const roadmap = DIMENSION_CODES.filter(
      (d) => (targets.get(d) ?? 0) > (levels.get(d) ?? 1),
    );
    const done = (d: DimensionCode): boolean =>
      (current.get(d) ?? 1) >= (targets.get(d) ?? 0);
    const enablers = (d: DimensionCode): DimensionCode[] =>
      graph
        .incomingEdges(d)
        .map((e) => e.source)
        .filter((s) => roadmap.includes(s));

    const phases: PlannedStep[][] = [];
    while (roadmap.some((d) => !done(d))) {
      const workable = roadmap.filter(
        (d) => !done(d) && enablers(d).every(done),
      );
      if (workable.length === 0) {
        // The graph is acyclic by construction; reaching this means it was not.
        throw new DependencyGraphCycleError(roadmap.filter((d) => !done(d)));
      }
      const phase = workable.map((d) => {
        const from = current.get(d) ?? 1;
        const to = Math.min(targets.get(d)!, from + maxLevelsPerPhase);
        return { dimension: d, fromLevel: from, toLevel: to };
      });
      for (const step of phase) current.set(step.dimension, step.toLevel);
      phases.push(phase);
    }
    return phases;
  }
}
