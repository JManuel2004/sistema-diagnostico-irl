import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetMaturityProfileUseCase } from '../../usecase/get-maturity-profile.use-case.js';
import type { MaturityProfileResponse } from '@innlab/contracts';

@ApiTags('profile')
@Controller('diagnostics/:id/profile')
export class MaturityProfileController {
  constructor(private readonly getProfile: GetMaturityProfileUseCase) {}

  @Get()
  @ApiOkResponse({
    description: 'Perfil de madurez persistido',
  })
  get(@Param('id') diagnosticId: string): Promise<MaturityProfileResponse> {
    return this.getProfile.execute({ diagnosticId });
  }
}
