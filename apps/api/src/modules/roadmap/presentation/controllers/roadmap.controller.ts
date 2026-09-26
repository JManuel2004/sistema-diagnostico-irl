import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { RoadmapResponse } from '@innlab/contracts';
import { GetScalingRoadmapUseCase } from '../../application/use-cases/get-scaling-roadmap.use-case.js';
import type { AuthenticatedUser } from '../../../../shared/identity/application/dtos/authenticated-user.js';
import { CurrentUser } from '../../../../shared/identity/presentation/decorators/current-user.decorator.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';
import { DiagnosticIdParam } from '../../../../shared/kernel/presentation/dto/diagnostic-id.param.js';
import { ApiErrors } from '../../../../shared/kernel/presentation/api-errors.decorator.js';
import { RoadmapResponseDto } from './dto/roadmap.response.dto.js';

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
@ApiBearerAuth()
@Controller('diagnostics/:id/roadmap')
export class RoadmapController {
  constructor(private readonly roadmap: GetScalingRoadmapUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Read the scaling roadmap',
    description:
      'The roadmap saved when the deep analysis was accepted (RF-14); 409 before that. An ' +
      'empty `phases` means the initiative meets the expected minimum in all six dimensions.',
  })
  @ApiOkResponse({ type: RoadmapResponseDto })
  @ApiErrors(404, 409, 422)
  async get(
    @Param() { id }: DiagnosticIdParam,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<RoadmapResponse> {
    return unwrapResult(
      await this.roadmap.execute({ diagnosticId: id, userId: user.id }),
    );
  }
}
