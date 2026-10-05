import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { DiagnosticReport } from '@innlab/contracts';
import { GetDiagnosticReportUseCase } from '../../application/use-cases/get-diagnostic-report.use-case.js';
import type { AuthenticatedUser } from '../../../../shared/identity/application/dtos/authenticated-user.js';
import { CurrentUser } from '../../../../shared/identity/presentation/decorators/current-user.decorator.js';
import { unwrapResult } from '../../../../shared/kernel/application/unwrap-result.js';
import { DiagnosticIdParam } from '../../../../shared/kernel/presentation/dto/diagnostic-id.param.js';
import { ApiErrors } from '../../../../shared/kernel/presentation/api-errors.decorator.js';
import { DiagnosticReportResponseDto } from './dto/report.response.dto.js';

/**
 * HTTP surface of the full report (RF-16).
 *
 * `GET` gathers the saved results of the diagnostic; it calculates nothing.
 * Before the deep analysis is complete the use case's `Result.err`
 * (`ReportNotAvailableError`) unwraps to a 409.
 */
@ApiTags('reporting')
@ApiBearerAuth()
@Controller('diagnostics/:id/report')
export class ReportController {
  constructor(private readonly report: GetDiagnosticReportUseCase) {}

  @Get()
  @ApiOperation({
    summary: 'Read the full report of a diagnostic',
    description:
      'The initiative, the maturity profile (gaps, imbalances, critical state), the INNLAB ' +
      'recommendation and the roadmap, with the KTH framework attribution (RF-16). 409 ' +
      '`REPORT_NOT_AVAILABLE` until the deep analysis is complete.',
  })
  @ApiOkResponse({ type: DiagnosticReportResponseDto })
  @ApiErrors(404, 409, 422)
  async get(
    @Param() { id }: DiagnosticIdParam,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DiagnosticReport> {
    return unwrapResult(
      await this.report.execute({ diagnosticId: id, userId: user.id }),
    );
  }
}
