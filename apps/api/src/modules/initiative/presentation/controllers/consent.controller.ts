import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { ConsentRecord } from '@innlab/contracts';
import { CurrentUser } from '../../../../shared/identity/presentation/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../../shared/identity/application/dtos/authenticated-user.js';
import { RecordConsentUseCase } from '../../application/use-cases/record-consent.use-case.js';
import { GetConsentUseCase } from '../../application/use-cases/get-consent.use-case.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';
import { DiagnosticIdParam } from '../../../../shared/kernel/presentation/dto/diagnostic-id.param.js';
import { ApiErrors } from '../../../../shared/kernel/presentation/api-errors.decorator.js';
import { RecordConsentRequestDto } from './dto/initiative.request.dto.js';
import { ConsentRecordResponseDto } from './dto/initiative.response.dto.js';

@ApiTags('consent')
@ApiBearerAuth()
@Controller('diagnostics/:id/consent')
export class ConsentController {
  constructor(
    private readonly record: RecordConsentUseCase,
    private readonly get: GetConsentUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Accept the data-processing consent',
    description:
      'Records the acceptance of the text version the user read (Law 1581, RF-03) and ' +
      'publishes `ConsentRecordedEvent`. 409 if the version is not the current one; 403/404 ' +
      'if the diagnostic is not the caller’s.',
  })
  @ApiCreatedResponse({ type: ConsentRecordResponseDto })
  @ApiErrors(404, 409, 422)
  async recordConsent(
    @Param() { id }: DiagnosticIdParam,
    @Body() body: RecordConsentRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConsentRecord> {
    return unwrapResult(
      await this.record.execute({
        diagnosticId: id,
        cognitoUserId: user.id,
        version: body.version,
      }),
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Read the consent',
    description: '404 while the diagnostic has no accepted consent.',
  })
  @ApiOkResponse({ type: ConsentRecordResponseDto })
  @ApiErrors(404, 422)
  async getConsent(@Param() { id }: DiagnosticIdParam): Promise<ConsentRecord> {
    return unwrapResult(await this.get.execute(id));
  }
}
