import { type DependencyGraphRepositoryPort } from '../../domain/repositories/dependency-graph.repository.port.js';
import { type RoadmapRepositoryPort } from '../../domain/repositories/roadmap.repository.port.js';
import { DependencyGraph } from '../../domain/value-objects/dependency-graph.vo.js';
import type { RoadmapClosureService } from '../../domain/services/roadmap-closure.service.js';
import { RoadmapBalancingService } from '../../domain/services/roadmap-balancing.service.js';
import type { PhasePlannerService } from '../../domain/services/phase-planner.service.js';
import { type PhaseServiceAdvisorPort } from '../../domain/repositories/phase-service-advisor.port.js';
import {
  DIMENSION_CODES,
  type DimensionCode,
  type PhaseServiceTrace,
} from '@innlab/contracts';
import type { TargetLevelCalculatorService } from '../../domain/services/target-level-calculator.service.js';
import {
  ScalingRoadmap,
  type RoadmapPhase,
} from '../../domain/entities/scaling-roadmap.aggregate.js';
import { RoadmapCalculationError } from '../../domain/exceptions/roadmap.errors.js';
import type { GetMaturityProfileUseCase } from '../../../diagnosis/application/use-cases/get-maturity-profile.use-case.js';
import { irlLevelsByDimension } from '../../../../shared/irl-taxonomy/domain/services/irl-levels-by-dimension.js';
import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import type { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';

export interface GenerateScalingRoadmapCommand {
  diagnosticId: string;
}

/**
 * Builds the scaling roadmap from the maturity profile and saves it.
 *
 * The roadmap is a fixed result with its date, like the profile and the
 * recommendation: it is calculated when the user accepts the deep analysis
 * and `GET /roadmap` only reads what was saved. Calculating again (the
 * acceptance is repeatable) replaces the saved one.
 *
 * The route, in four steps over pure domain services:
 *
 *  1. Targets: the dimensions below their expected minimum, closed over
 *     their enablers (`RoadmapClosureService`), each with the level the
 *     minimum or a dependent asks for (`TargetLevelCalculatorService`).
 *  2. Balance: the route must not end with an imbalance with an alert, so
 *     the lower dimension of every pair too far apart rises too
 *     (`RoadmapBalancingService`); it may bring new dimensions in.
 *  3. Phases: each phase works the dimensions whose enablers already got
 *     there, at most `maxLevelsPerPhase` levels each
 *     (`PhasePlannerService`).
 *  4. A service per phase, through the portfolio (`PhaseServiceAdvisorPort`,
 *     over the queries `routing/` exports): the first phase opens with the
 *     portfolio recommendation; each next one gets the service that best
 *     works its dimensions on the profile projected to its start, never
 *     lighter than the previous one and never repeated.
 *
 * Reads the profile through `MaturityProfileModule`'s read use case,
 * never reaching into its tables; the same coupling
 * `GenerateRecommendationUseCase` already uses.
 *
 * Publishes no event: `ScalingRoadmapCalculatedEvent` is published by
 * `DeepAnalysisRequestedListener`, which calls this use case.
 *
 * The levels come from `irlLevelsByDimension`, which also explains why the
 * persisted `dimension_result` flags are not consumed.
 */
export class GenerateScalingRoadmapUseCase {
  constructor(
    private readonly graphs: DependencyGraphRepositoryPort,
    private readonly profiles: GetMaturityProfileUseCase,
    private readonly closure: RoadmapClosureService,
    private readonly targets: TargetLevelCalculatorService,
    private readonly balancing: RoadmapBalancingService,
    private readonly planner: PhasePlannerService,
    private readonly advisor: PhaseServiceAdvisorPort,
    private readonly roadmaps: RoadmapRepositoryPort,
  ) {}

  async execute(
    cmd: GenerateScalingRoadmapCommand,
  ): Promise<Result<ScalingRoadmap, ConflictError>> {
    const diagnosticId = Uuid.create(cmd.diagnosticId);

    // If the profile is not computed, `GetMaturityProfileUseCase` returns
    // `Result.err(ConflictError('PROFILE_NOT_YET_COMPUTED'))` → 409, same
    // as `GET /diagnostics/:id/profile`. Propagated as this use case's
    // own `Result.err` rather than unwrapped further: same condition,
    // same deserved response.
    const result = await this.profiles.execute({
      diagnosticId: diagnosticId.value,
    });
    if (!result.ok) {
      return Result.err(result.error);
    }
    const profile = result.value;

    if (profile.dimensionResults.length !== 6) {
      throw new RoadmapCalculationError(
        `Expected 6 dimensional levels, received ${profile.dimensionResults.length}`,
        { received: profile.dimensionResults.length },
      );
    }

    const levels = irlLevelsByDimension(profile.dimensionResults);

    const [edges, minimums, parameters] = await Promise.all([
      this.graphs.findEdges(),
      this.graphs.findExpectedMinimums(),
      this.graphs.findParameters(),
    ]);
    // Without its parameters the route is neither paced nor balanced: each
    // dimension rises to its target in one phase, as before balancing existed.
    const { maxLevelsPerPhase, balanceTolerance } = parameters ?? UNPACED;

    const graph = DependencyGraph.create(edges, minimums);

    // 1–2. Targets, then balance.
    const closure = this.closure.compute(levels, graph);
    const dependencyTargets = this.targets.compute(closure, graph);
    const final = this.balancing.balance(
      levels,
      dependencyTargets,
      graph,
      balanceTolerance,
    );
    const finalTargets = new Map(
      [...final].map(([d, t]) => [d, t.target] as const),
    );
    const roadmapDimensions = new Set(final.keys());

    // 3. Phases.
    const planned = this.planner.plan(
      levels,
      finalTargets,
      graph,
      maxLevelsPerPhase,
    );

    // 4. A service per phase, on the profile projected to its start.
    const projected = new Map(levels);
    const used: number[] = [];
    let minimumTierOrder = 1;
    const phases: RoadmapPhase[] = [];
    for (const [index, steps] of planned.entries()) {
      const advice = await this.advisor.advise({
        diagnosticId: diagnosticId.value,
        levels: asRecord(projected),
        work: steps,
        minimumTierOrder,
        excludedServiceIds: [...used],
        mode: index === 0 ? 'RECOMMENDATION' : 'PHASE',
      });
      const service = advice?.service ?? null;
      if (service) {
        used.push(service.idService);
        minimumTierOrder = Math.max(minimumTierOrder, service.tierOrder);
      }

      phases.push({
        order: index + 1,
        dimensions: steps.map((step) => {
          const target = final.get(step.dimension)!;
          return {
            dimensionCode: step.dimension,
            currentLevel: step.fromLevel,
            targetLevel: step.toLevel,
            finalTargetLevel: target.target,
            // What it unblocks: the roadmap dimensions that depend on it.
            enables: graph
              .outgoingEdges(step.dimension)
              .filter((e) => roadmapDimensions.has(e.target))
              .map((e) => e.target),
            inclusionReason: target.inclusionReason,
            expectedMinimum: graph.expectedMinimum(step.dimension),
            targetReason: target.targetReason,
            targetDrivenBy: target.targetDrivenBy,
          };
        }),
        service,
        serviceTrace: advice?.trace ?? noAdviceTrace(projected),
      });
      for (const step of steps) projected.set(step.dimension, step.toLevel);
    }

    const roadmap = ScalingRoadmap.create({
      diagnosticId,
      phases,
      finalLevels: asRecord(projected),
      balanced: RoadmapBalancingService.isBalanced(projected, balanceTolerance),
      generatedAt: new Date(),
    });

    await this.roadmaps.save(roadmap);

    return Result.ok(roadmap);
  }
}

/** The route without its parameters: no limit per phase, balance as the framework's acceptable gap. */
const UNPACED = { maxLevelsPerPhase: 8, balanceTolerance: 8 } as const;

function asRecord(
  levels: ReadonlyMap<DimensionCode, number>,
): Record<DimensionCode, number> {
  return Object.fromEntries(
    DIMENSION_CODES.map((code) => [code, levels.get(code) ?? 1]),
  ) as Record<DimensionCode, number>;
}

/** The trace of a phase whose service could not be asked: the routing configuration is missing. */
function noAdviceTrace(
  levels: ReadonlyMap<DimensionCode, number>,
): PhaseServiceTrace {
  const values = DIMENSION_CODES.map((code) => levels.get(code) ?? 1);
  return {
    mode: 'PHASE',
    projectedLevels: asRecord(levels),
    averageLevel:
      Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 1000) /
      1000,
    excluded: [],
    skipped: [],
    ranking: [],
    appliedAdjustments: [],
  };
}
