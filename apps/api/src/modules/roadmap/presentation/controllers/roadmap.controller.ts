import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { RoadmapResponse } from '@innlab/contracts';
import { GetScalingRoadmapUseCase } from '../../application/use-cases/get-scaling-roadmap.use-case.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';

/**
 * HTTP surface for the scaling roadmap (RF-14).
 *
 * `GET` and not `POST`: the roadmap is a deterministic function of the
 * profile and the seeded graph, so reading it creates nothing. With a
 * static configuration, recomputing it on every read always gives the
 * same result; persisting it only becomes necessary once the graph can
 * change and reproducing an old roadmap is required.
 *
 * It is requested **separately** from the portfolio recommendation. They
 * are two independent reads of the same profile, not a chain: the
 * roadmap neither calls the router nor depends on it. The frontend
 * composes both.
 *
 * If the diagnostic has no computed profile, the use case's `Result.err`
 * (a `ConflictError`, propagated from `GetMaturityProfileUseCase`)
 * unwraps to a 409, exactly like `GET /diagnostics/:id/profile`.
 */
@ApiTags('roadmap')
@Controller('diagnostics/:id/roadmap')
export class RoadmapController {
  constructor(private readonly roadmap: GetScalingRoadmapUseCase) {}

  @Get()
  @ApiOkResponse({
    description:
      'Phased scaling roadmap. An empty `phases` means the initiative ' +
      'meets the expected minimum in all six dimensions.',
  })
  async get(@Param('id') diagnosticId: string): Promise<RoadmapResponse> {
    return unwrapResult(await this.roadmap.execute({ diagnosticId }));
  }
}
