import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { MaturityProfileResponse } from '@innlab/contracts';
import { GetOwnMaturityProfileUseCase } from '../../application/use-cases/get-own-maturity-profile.use-case.js';
import type { AuthenticatedUser } from '../../../../shared/identity/application/dtos/authenticated-user.js';
import { CurrentUser } from '../../../../shared/identity/presentation/decorators/current-user.decorator.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';
import { DiagnosticIdParam } from '../../../../shared/kernel/presentation/dto/diagnostic-id.param.js';
import { ApiErrors } from '../../../../shared/kernel/presentation/api-errors.decorator.js';
import { MaturityProfileResponseDto } from './dto/diagnosis.response.dto.js';

@ApiTags('profile')
@ApiBearerAuth()
@Controller('diagnostics/:id/profile')
export class MaturityProfileController {
  constructor(private readonly getProfile: GetOwnMaturityProfileUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Read the maturity profile',
    description:
      'The saved profile: level per dimension, bottleneck, strength, asymmetry, gaps, ' +
      'critical state and imbalances (RF-07 to RF-13). 409 while it has not been computed; 404 for a diagnostic of another user.',
  })
  @ApiOkResponse({ type: MaturityProfileResponseDto })
  @ApiErrors(404, 409, 422)
  async get(
    @Param() { id }: DiagnosticIdParam,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MaturityProfileResponse> {
    return unwrapResult(
      await this.getProfile.execute({ diagnosticId: id, userId: user.id }),
    );
  }
}
