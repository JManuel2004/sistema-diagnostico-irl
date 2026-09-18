import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { ConsentRecord } from '@innlab/contracts';
import { CurrentUser } from '../../../../shared/identity/infrastructure/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../../shared/identity/domain/entities/authenticated-user.vo.js';
import { RecordConsentUseCase } from '../../application/use-cases/record-consent.use-case.js';
import { GetConsentUseCase } from '../../application/use-cases/get-consent.use-case.js';

/**
 * HTTP surface for privacy consent, Law 1581 (RF-03 / HU-05).
 *
 * Routes:
 *   - `POST /api/v1/diagnostics/:id/consent` — accept.
 *   - `GET  /api/v1/diagnostics/:id/consent` — 404 until accepted, per
 *     `consentRecordSchema` in `@innlab/contracts`.
 */
@ApiTags('consent')
@Controller('diagnostics/:id/consent')
export class ConsentController {
  constructor(
    private readonly record: RecordConsentUseCase,
    private readonly get: GetConsentUseCase,
  ) {}

  @Post()
  @ApiCreatedResponse({ description: 'Consent recorded for this diagnostic' })
  recordConsent(
    @Param('id') diagnosticId: string,
    @Body() body: { version: string },
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConsentRecord> {
    return this.record.execute({
      diagnosticId,
      keycloakUserId: user.id,
      version: body.version,
    });
  }

  @Get()
  @ApiOkResponse({ description: 'Consent recorded for this diagnostic' })
  getConsent(@Param('id') diagnosticId: string): Promise<ConsentRecord> {
    return this.get.execute(diagnosticId);
  }
}
