import { Controller, Get, Param, StreamableFile } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { DiagnosticReport } from '@innlab/contracts';
import { GetDiagnosticReportUseCase } from '../../application/use-cases/get-diagnostic-report.use-case.js';
import { DownloadDiagnosticReportUseCase } from '../../application/use-cases/download-diagnostic-report.use-case.js';
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
 * `GET pdf` is the same report as a downloadable file (HU-24). Before the
 * deep analysis is complete both answer the use case's `Result.err`
 * (`ReportNotAvailableError`), unwrapped to a 409.
 */
@ApiTags('reporting')
@ApiBearerAuth()
@Controller('diagnostics/:id/report')
export class ReportController {
  constructor(
    private readonly report: GetDiagnosticReportUseCase,
    private readonly download: DownloadDiagnosticReportUseCase,
  ) {}

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

  @Get('pdf')
  @ApiOperation({
    summary: 'Download the full report of a diagnostic as a PDF',
    description:
      'The same report as `GET report`, as an attached PDF file with the KTH framework ' +
      'attribution and its CC BY-NC-SA 4.0 license (RF-16, HU-24). 409 ' +
      '`REPORT_NOT_AVAILABLE` until the deep analysis is complete.',
  })
  @ApiProduces('application/pdf')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @ApiErrors(404, 409, 422)
  async pdf(
    @Param() { id }: DiagnosticIdParam,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const file = unwrapResult(
      await this.download.execute({ diagnosticId: id, userId: user.id }),
    );
    return new StreamableFile(file.content, {
      type: file.contentType,
      disposition: `attachment; filename="${file.fileName}"`,
      length: file.content.byteLength,
    });
  }
}
