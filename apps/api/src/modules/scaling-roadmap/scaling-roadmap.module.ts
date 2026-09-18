import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DimensionDependencyOrm } from './infrastructure/persistence/dimension-dependency.orm-entity.js';
import { DimensionOrm } from '../../shared/irl-taxonomy/infrastructure/database/orm-entities/dimension.orm-entity.js';
import { TypeOrmDependencyGraphRepository } from './infrastructure/persistence/typeorm-dependency-graph.repository.js';
import { DEPENDENCY_GRAPH_REPOSITORY } from './domain/ports/dependency-graph.repository.port.js';
import { RoadmapClosureService } from './domain/services/roadmap-closure.service.js';
import { TopologicalLayeringService } from './domain/services/topological-layering.service.js';
import { TargetLevelCalculatorService } from './domain/services/target-level-calculator.service.js';
import { GenerateScalingRoadmapUseCase } from './usecase/generate-scaling-roadmap.use-case.js';
import { RoadmapController } from './application/http/roadmap.controller.js';
import { DiagnosisModule } from '../diagnosis/diagnosis.module.js';

/**
 * `ScalingRoadmapModule` — bounded context for the scaling roadmap
 * (RF-14).
 *
 * Structurally symmetric to `RoutingModule`: its own controller
 * and an import of `DiagnosisModule` to read the profile through
 * its read use case, never reaching into its tables. This is a conscious
 * deviation from the plan, which proposed hanging the endpoint off
 * `DiagnosticController`; symmetry with the sibling module already built
 * is preferred over leaving two different patterns for two contexts
 * created days apart.
 *
 * The three domain services are pure and undecorated: Nest registers
 * them as class providers because they take nothing in the constructor,
 * just like `IrlCalculatorService`.
 *
 * `DimensionOrm` is registered here because the adapter needs to
 * translate ids to codes and read `minimum_expected_level`. That is a
 * catalog read, not a write against another module's table.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DimensionDependencyOrm, DimensionOrm]),
    DiagnosisModule,
  ],
  providers: [
    RoadmapClosureService,
    TopologicalLayeringService,
    TargetLevelCalculatorService,
    GenerateScalingRoadmapUseCase,
    {
      provide: DEPENDENCY_GRAPH_REPOSITORY,
      useClass: TypeOrmDependencyGraphRepository,
    },
  ],
  controllers: [RoadmapController],
  exports: [GenerateScalingRoadmapUseCase, DEPENDENCY_GRAPH_REPOSITORY],
})
export class ScalingRoadmapModule {}
