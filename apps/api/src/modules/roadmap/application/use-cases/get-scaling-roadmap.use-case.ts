import { Inject, Injectable } from '@nestjs/common';
import type { RoadmapResponse } from '@innlab/contracts';
import {
  TAXONOMY_REPOSITORY,
  type TaxonomyRepositoryPort,
} from '../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import { GenerateScalingRoadmapUseCase } from './generate-scaling-roadmap.use-case.js';
import { toRoadmapResponse } from '../dtos/map-roadmap-response.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import type { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';

export interface GetScalingRoadmapQuery {
  diagnosticId: string;
}

/**
 * The roadmap as the API serves it: the calculated `ScalingRoadmap` with each
 * dimension named from the catalog (`name`, `shortName`), so the frontend
 * keeps no name map of its own (backlog 4.5).
 *
 * A read. It runs the calculation but publishes nothing:
 * `ScalingRoadmapCalculatedEvent` belongs to the flow triggered by
 * `DeepAnalysisRequestedEvent` (backlog 14.4), which uses
 * `GenerateScalingRoadmapUseCase` directly.
 */
@Injectable()
export class GetScalingRoadmapUseCase {
  constructor(
    private readonly generate: GenerateScalingRoadmapUseCase,
    @Inject(TAXONOMY_REPOSITORY)
    private readonly taxonomy: TaxonomyRepositoryPort,
  ) {}

  async execute(
    query: GetScalingRoadmapQuery,
  ): Promise<Result<RoadmapResponse, ConflictError>> {
    const roadmap = await this.generate.execute(query);
    if (!roadmap.ok) return Result.err(roadmap.error);

    const dimensions = await this.taxonomy.findAllDimensions();
    return Result.ok(toRoadmapResponse(roadmap.value, dimensions));
  }
}
