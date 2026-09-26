import { type DependencyGraphRepositoryPort } from '../../domain/repositories/dependency-graph.repository.port.js';
import { type RoadmapRepositoryPort } from '../../domain/repositories/roadmap.repository.port.js';
import { DependencyGraph } from '../../domain/value-objects/dependency-graph.vo.js';
import type { RoadmapClosureService } from '../../domain/services/roadmap-closure.service.js';
import type { TopologicalLayeringService } from '../../domain/services/topological-layering.service.js';
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
 * Resolves the IO — profile and graph — and then chains three pure
 * domain services. None of them touches the database, so the whole
 * algorithm is tested with literals and without starting anything.
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
    private readonly layering: TopologicalLayeringService,
    private readonly targets: TargetLevelCalculatorService,
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

    const [edges, minimums] = await Promise.all([
      this.graphs.findEdges(),
      this.graphs.findExpectedMinimums(),
    ]);

    const graph = DependencyGraph.create(edges, minimums);

    const closure = this.closure.compute(levels, graph);
    const layers = this.layering.layer(closure, graph);
    const targets = this.targets.compute(closure, graph);

    const phases: RoadmapPhase[] = layers.map((layer, index) => ({
      order: index + 1,
      dimensions: layer.map((code) => ({
        dimensionCode: code,
        currentLevel: levels.get(code) ?? 0,
        targetLevel: targets.get(code) ?? graph.expectedMinimum(code),
        // The justification: what this dimension unblocks, limited to
        // the ones that are actually going to be worked on.
        enables: graph
          .outgoingEdges(code)
          .filter((e) => closure.has(e.target))
          .map((e) => e.target),
        inclusionReason:
          (levels.get(code) ?? 0) < graph.expectedMinimum(code)
            ? ('BELOW_EXPECTED_MINIMUM' as const)
            : ('REQUIRED_ENABLER' as const),
        expectedMinimum: graph.expectedMinimum(code),
        targetDrivenBy: this.targets.demandedBy(code, closure, graph),
      })),
    }));

    const roadmap = ScalingRoadmap.create({
      diagnosticId,
      phases,
      generatedAt: new Date(),
    });

    await this.roadmaps.save(roadmap);

    return Result.ok(roadmap);
  }
}
