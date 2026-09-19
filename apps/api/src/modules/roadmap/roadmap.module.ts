import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DimensionDependencyOrm } from './infrastructure/database/orm-entities/dimension-dependency.orm-entity.js';
import { TypeOrmDependencyGraphRepository } from './infrastructure/database/repositories/typeorm-dependency-graph.repository.js';
import { DEPENDENCY_GRAPH_REPOSITORY } from './domain/repositories/dependency-graph.repository.port.js';
import { RoadmapClosureService } from './domain/services/roadmap-closure.service.js';
import { TopologicalLayeringService } from './domain/services/topological-layering.service.js';
import { TargetLevelCalculatorService } from './domain/services/target-level-calculator.service.js';
import { GenerateScalingRoadmapUseCase } from './application/use-cases/generate-scaling-roadmap.use-case.js';
import { RoadmapController } from './presentation/controllers/roadmap.controller.js';
import { DeepAnalysisRequestedListener } from './infrastructure/messaging/deep-analysis-requested.listener.js';
import { DiagnosisModule } from '../diagnosis/diagnosis.module.js';
import { IrlTaxonomyModule } from '../../shared/irl-taxonomy/irl-taxonomy.module.js';

/**
 * `RoadmapModule` — bounded context for the scaling roadmap (RF-14).
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
 * Reads dimensions through `IrlTaxonomyModule`'s port, not `DimensionOrm`
 * directly — `shared/irl-taxonomy/` is its own bounded context, not a
 * table any module can reach into (fixed in Oleada 5, was the pending
 * cross-module `DimensionOrm` access documented on that module).
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DimensionDependencyOrm]),
    IrlTaxonomyModule,
    DiagnosisModule,
  ],
  providers: [
    RoadmapClosureService,
    TopologicalLayeringService,
    TargetLevelCalculatorService,
    GenerateScalingRoadmapUseCase,
    DeepAnalysisRequestedListener,
    {
      provide: DEPENDENCY_GRAPH_REPOSITORY,
      useClass: TypeOrmDependencyGraphRepository,
    },
  ],
  controllers: [RoadmapController],
  exports: [GenerateScalingRoadmapUseCase, DEPENDENCY_GRAPH_REPOSITORY],
})
export class RoadmapModule {}
