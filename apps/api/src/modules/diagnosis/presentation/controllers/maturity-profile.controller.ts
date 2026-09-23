import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetMaturityProfileUseCase } from '../../application/use-cases/get-maturity-profile.use-case.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';
import type { MaturityProfileResponse } from '@innlab/contracts';

@ApiTags('profile')
@Controller('diagnostics/:id/profile')
export class MaturityProfileController {
  constructor(private readonly getProfile: GetMaturityProfileUseCase) {}

  @Get()
  @ApiOkResponse({
    description: 'Persisted maturity profile',
  })
  async get(@Param('id') diagnosticId: string): Promise<MaturityProfileResponse> {
    return unwrapResult(await this.getProfile.execute({ diagnosticId }));
  }
}
