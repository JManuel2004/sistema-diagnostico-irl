import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DependenciaDimensionOrm } from './infrastructure/persistence/dependencia-dimension.orm-entity.js';
import { DimensionOrm } from '../irl-catalog/infrastructure/persistence/entities/dimension.orm-entity.js';
import { TypeOrmDependencyGraphRepository } from './infrastructure/persistence/typeorm-dependency-graph.repository.js';
import { DEPENDENCY_GRAPH_REPOSITORY } from './domain/ports/dependency-graph.repository.port.js';
import { RoadmapClosureService } from './domain/services/roadmap-closure.service.js';
import { TopologicalLayeringService } from './domain/services/topological-layering.service.js';
import { TargetLevelCalculatorService } from './domain/services/target-level-calculator.service.js';
import { GenerateScalingRoadmapUseCase } from './application/generate-scaling-roadmap.use-case.js';
import { RoadmapController } from './interfaces/http/roadmap.controller.js';
import { MaturityProfileModule } from '../maturity-profile/maturity-profile.module.js';

/**
 * `ScalingRoadmapModule` — contexto acotado del roadmap de escalamiento
 * (RF-14).
 *
 * Estructura simétrica a `PortfolioRoutingModule`: controlador propio e
 * importación de `MaturityProfileModule` para leer el perfil por su caso
 * de uso de lectura, nunca alcanzando sus tablas. Es una desviación
 * consciente respecto del plan, que proponía colgar el endpoint de
 * `DiagnosticController`; se prefiere la simetría con el módulo hermano
 * ya implementado antes que dejar dos patrones distintos para dos
 * contextos creados con días de diferencia.
 *
 * Los tres servicios de dominio son puros y sin decoradores: Nest los
 * registra como providers de clase porque no reciben nada en el
 * constructor, igual que `IrlCalculatorService`.
 *
 * `DimensionOrm` se registra aquí porque el adaptador necesita traducir
 * ids a códigos y leer `nivel_minimo_esperado`. Es lectura de catálogo,
 * no escritura sobre una tabla ajena.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DependenciaDimensionOrm, DimensionOrm]),
    MaturityProfileModule,
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
