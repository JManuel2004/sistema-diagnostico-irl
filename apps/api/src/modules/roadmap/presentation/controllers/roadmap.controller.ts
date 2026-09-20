import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { RoadmapResponse } from '@innlab/contracts';
import { GetScalingRoadmapUseCase } from '../../application/use-cases/get-scaling-roadmap.use-case.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';

/**
 * HTTP surface for the scaling roadmap (RF-14).
 *
 * `GET` reads the roadmap saved when the user accepted the deep analysis
 * (`POST /diagnostics/:id/deep-analysis`); it neither calculates nor
 * creates anything. Until the analysis is accepted the use case's
 * `Result.err` (`RoadmapNotGeneratedError`) unwraps to a 409, the same
 * shape as `GET /diagnostics/:id/recommendation`.
 *
 * It is requested **separately** from the portfolio recommendation. They
 * are two independent reads of results saved by two independent
 * listeners, not a chain. The frontend composes both.
 */
@ApiTags('roadmap')
@Controller('diagnostics/:id/roadmap')
export class RoadmapController {
  constructor(private readonly roadmap: GetScalingRoadmapUseCase) {}

  @Get()
  @ApiOkResponse({
    description:
      'Saved phased scaling roadmap. An empty `phases` means the initiative ' +
      'meets the expected minimum in all six dimensions.',
  })
  async get(@Param('id') diagnosticId: string): Promise<RoadmapResponse> {
    return unwrapResult(await this.roadmap.execute({ diagnosticId }));
  }
}
