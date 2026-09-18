import { Inject, Injectable } from '@nestjs/common';
import type { DimensionCode } from '@innlab/contracts';
import {
  DEPENDENCY_GRAPH_REPOSITORY,
  type DependencyGraphRepositoryPort,
} from '../domain/ports/dependency-graph.repository.port.js';
import { DependencyGraph } from '../domain/value-objects/dependency-graph.vo.js';
import { RoadmapClosureService } from '../domain/services/roadmap-closure.service.js';
import { TopologicalLayeringService } from '../domain/services/topological-layering.service.js';
import { TargetLevelCalculatorService } from '../domain/services/target-level-calculator.service.js';
import {
  ScalingRoadmap,
  type RoadmapPhase,
} from '../domain/entities/scaling-roadmap.aggregate.js';
import { RoadmapCalculationError } from '../domain/errors/roadmap.errors.js';
import { GetMaturityProfileUseCase } from '../../maturity-profile/usecase/get-maturity-profile.use-case.js';
import { Uuid } from '../../../shared/kernel/domain/value-objects/uuid.vo.js';

export interface GenerateScalingRoadmapCommand {
  diagnosticId: string;
}

/**
 * Builds the scaling roadmap from the maturity profile.
 *
 * Resolves the IO — profile and graph — and then chains three pure
 * domain services. None of them touches the database, so the whole
 * algorithm is tested with literals and without starting anything.
 *
 * Reads the profile through `MaturityProfileModule`'s read use case,
 * never reaching into its tables; the same coupling
 * `GenerateRecommendationUseCase` already uses.
 *
 * A note on the levels: they come from `dimensionResults[].irlLevel`,
 * which is correct and verified. `dimension_result.is_bottleneck` and
 * `in_critical_state` are deliberately **not** consumed: the first is
 * always persisted as `false` and the second holds semantics different
 * from the SRS. This approach does not need them, and that independence
 * is one of its real advantages.
 */
@Injectable()
export class GenerateScalingRoadmapUseCase {
  constructor(
    @Inject(DEPENDENCY_GRAPH_REPOSITORY)
    private readonly graphs: DependencyGraphRepositoryPort,
    private readonly profiles: GetMaturityProfileUseCase,
    private readonly closure: RoadmapClosureService,
    private readonly layering: TopologicalLayeringService,
    private readonly targets: TargetLevelCalculatorService,
  ) {}

  async execute(cmd: GenerateScalingRoadmapCommand): Promise<ScalingRoadmap> {
    const diagnosticId = Uuid.create(cmd.diagnosticId);

    // If the profile is not computed, `GetMaturityProfileUseCase`
    // throws `ConflictError('PROFILE_NOT_YET_COMPUTED')` → 409, same as
    // `GET /diagnostics/:id/profile`. It is left to propagate as-is
    // rather than wrapped: same condition, same deserved response.
    const profile = await this.profiles.execute({
      diagnosticId: diagnosticId.value,
    });

    if (profile.dimensionResults.length !== 6) {
      throw new RoadmapCalculationError(
        `Expected 6 dimensional levels, received ${profile.dimensionResults.length}`,
        { received: profile.dimensionResults.length },
      );
    }

    const levels = new Map<DimensionCode, number>(
      profile.dimensionResults.map((r) => [r.dimensionCode, r.irlLevel]),
    );

    const [edges, minimums] = await Promise.all([
      this.graphs.findActiveEdges(),
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
      })),
    }));

    return ScalingRoadmap.create({
      diagnosticId,
      phases,
      generatedAt: new Date(),
    });
  }
}
