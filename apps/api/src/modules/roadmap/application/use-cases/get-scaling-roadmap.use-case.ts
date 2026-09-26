import type { RoadmapResponse } from '@innlab/contracts';
import { type TaxonomyRepositoryPort } from '../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import { type RoadmapRepositoryPort } from '../../domain/repositories/roadmap.repository.port.js';
import { RoadmapNotGeneratedError } from '../../domain/exceptions/roadmap.errors.js';
import { toRoadmapResponse } from '../dtos/map-roadmap-response.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import type { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { type DiagnosticOwnershipPort } from '../../domain/repositories/diagnostic-ownership.port.js';

export interface GetScalingRoadmapQuery {
  diagnosticId: string;
  /** The caller: someone else's diagnostic is answered as missing. */
  userId: string;
}

/**
 * The saved roadmap as the API serves it: each dimension named from the
 * catalog (`name`, `shortName`), so the frontend keeps no name map of its
 * own.
 *
 * A read of what `DeepAnalysisRequestedListener` saved; it does not
 * recalculate. "Not generated yet" is the normal state before the user
 * accepts the deep analysis, so it is a `Result.err`, not an exception.
 */
export class GetScalingRoadmapUseCase {
  constructor(
    private readonly roadmaps: RoadmapRepositoryPort,
    private readonly taxonomy: TaxonomyRepositoryPort,
    private readonly ownership: DiagnosticOwnershipPort,
  ) {}

  async execute(
    query: GetScalingRoadmapQuery,
  ): Promise<Result<RoadmapResponse, NotFoundError | RoadmapNotGeneratedError>> {
    const owned = await this.ownership.verify(query.diagnosticId, query.userId);
    if (!owned.ok) return owned;

    const roadmap = await this.roadmaps.findByDiagnosticId(query.diagnosticId);
    if (!roadmap) {
      return Result.err(new RoadmapNotGeneratedError(query.diagnosticId));
    }

    const dimensions = await this.taxonomy.findAllDimensions();
    return Result.ok(toRoadmapResponse(roadmap, dimensions));
  }
}
