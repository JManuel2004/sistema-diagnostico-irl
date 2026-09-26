import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ConsentTerms } from '@innlab/contracts';
import { GetCurrentConsentTermsUseCase } from '../../application/use-cases/get-current-consent-terms.use-case.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';
import { ApiErrors } from '../../../../shared/kernel/presentation/api-errors.decorator.js';
import { ConsentTermsResponseDto } from './dto/initiative.response.dto.js';

@ApiTags('initiative')
@ApiBearerAuth()
@Controller('consent-terms')
export class ConsentTermsController {
  constructor(private readonly current: GetCurrentConsentTermsUseCase) {}

  @Get('current')
  @ApiOperation({
    summary: 'Read the current consent text',
    description: 'The latest published version of the Law 1581 consent text (RF-03).',
  })
  @ApiOkResponse({ type: ConsentTermsResponseDto })
  @ApiErrors(404)
  async getCurrent(): Promise<ConsentTerms> {
    return unwrapResult(await this.current.execute());
  }
}
