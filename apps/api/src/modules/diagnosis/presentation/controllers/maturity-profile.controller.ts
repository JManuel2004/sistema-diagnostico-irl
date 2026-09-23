import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { MaturityProfileResponse } from '@innlab/contracts';
import { GetMaturityProfileUseCase } from '../../application/use-cases/get-maturity-profile.use-case.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';
import { DiagnosticIdParam } from '../../../../shared/kernel/presentation/dto/diagnostic-id.param.js';
import { ApiErrors } from '../../../../shared/kernel/presentation/api-errors.decorator.js';
import { MaturityProfileResponseDto } from './dto/diagnosis.response.dto.js';

@ApiTags('profile')
@ApiBearerAuth()
@Controller('diagnostics/:id/profile')
export class MaturityProfileController {
  constructor(private readonly getProfile: GetMaturityProfileUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Read the maturity profile',
    description:
      'The saved profile: level per dimension, bottleneck, strength, asymmetry, gaps, ' +
      'critical state and imbalances (RF-07 to RF-13). 409 while it has not been computed.',
  })
  @ApiOkResponse({ type: MaturityProfileResponseDto })
  @ApiErrors(409, 422)
  async get(
    @Param() { id }: DiagnosticIdParam,
  ): Promise<MaturityProfileResponse> {
    return unwrapResult(await this.getProfile.execute({ diagnosticId: id }));
  }
}
