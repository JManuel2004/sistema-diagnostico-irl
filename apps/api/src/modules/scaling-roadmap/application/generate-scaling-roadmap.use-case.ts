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
import { GetMaturityProfileUseCase } from '../../maturity-profile/application/get-maturity-profile.use-case.js';
import { Uuid } from '../../../shared-kernel/domain/value-objects/uuid.vo.js';

export interface GenerateScalingRoadmapCommand {
  diagnosticId: string;
}

/**
 * Construye el roadmap de escalamiento a partir del perfil de madurez.
 *
 * Resuelve la IO —perfil y grafo— y luego encadena tres servicios de
 * dominio puros. Ninguno toca la base de datos, así que todo el
 * algoritmo se prueba con literales y sin levantar nada.
 *
 * Lee el perfil por el caso de uso de lectura de `MaturityProfileModule`,
 * nunca alcanzando sus tablas; es el mismo acoplamiento que ya usa
 * `GenerateRecommendationUseCase`.
 *
 * Nota sobre los niveles: se toman de `dimensionResults[].irlLevel`, que
 * es correcto y está verificado. Deliberadamente **no** se consumen
 * `resultado_dimension.es_cuello_botella` ni `en_estado_critico`: la
 * primera se persiste siempre en `false` y la segunda guarda una
 * semántica distinta de la del SRS. Este enfoque no las necesita, y esa
 * independencia es una de sus ventajas reales.
 */
@Injectable()
export class GenerateScalingRoadmapUseCase {
  constructor(
    @Inject(DEPENDENCY_GRAPH_REPOSITORY)
    private readonly graphs: DependencyGraphRepositoryPort,
    private readonly perfiles: GetMaturityProfileUseCase,
    private readonly closure: RoadmapClosureService,
    private readonly layering: TopologicalLayeringService,
    private readonly targets: TargetLevelCalculatorService,
  ) {}

  async execute(cmd: GenerateScalingRoadmapCommand): Promise<ScalingRoadmap> {
    const diagnosticId = Uuid.create(cmd.diagnosticId);

    // Si el perfil no está calculado, `GetMaturityProfileUseCase` lanza
    // `ConflictError('PROFILE_NOT_YET_COMPUTED')` → 409, igual que
    // `GET /diagnosticos/:id/perfil`. Se deja propagar tal cual en vez de
    // envolverlo: es la misma condición y merece la misma respuesta.
    const perfil = await this.perfiles.execute({
      diagnosticId: diagnosticId.value,
    });

    if (perfil.dimensionResults.length !== 6) {
      throw new RoadmapCalculationError(
        `Se esperaban 6 niveles dimensionales, llegaron ${perfil.dimensionResults.length}`,
        { recibidos: perfil.dimensionResults.length },
      );
    }

    const niveles = new Map<DimensionCode, number>(
      perfil.dimensionResults.map((r) => [r.dimensionCode, r.irlLevel]),
    );

    const [aristas, minimos] = await Promise.all([
      this.graphs.findActiveEdges(),
      this.graphs.findExpectedMinimums(),
    ]);

    const grafo = DependencyGraph.create(aristas, minimos);

    const cerradura = this.closure.compute(niveles, grafo);
    const capas = this.layering.layer(cerradura, grafo);
    const metas = this.targets.compute(cerradura, grafo);

    const phases: RoadmapPhase[] = capas.map((capa, indice) => ({
      order: indice + 1,
      dimensions: capa.map((code) => ({
        dimensionCode: code,
        currentLevel: niveles.get(code) ?? 0,
        targetLevel: metas.get(code) ?? grafo.expectedMinimum(code),
        // La justificación: a quién desbloquea esta dimensión, limitado a
        // las que efectivamente se van a intervenir.
        enables: grafo
          .outgoingEdges(code)
          .filter((e) => cerradura.has(e.destino))
          .map((e) => e.destino),
      })),
    }));

    return ScalingRoadmap.create({
      diagnosticId,
      phases,
      generatedAt: new Date(),
    });
  }
}
