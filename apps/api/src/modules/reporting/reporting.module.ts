import { Module } from '@nestjs/common';
import { applicationProvider } from '../../shared/kernel/infrastructure/nest/application-provider.js';
import { DiagnosisModule } from '../diagnosis/diagnosis.module.js';
import { InitiativeModule } from '../initiative/initiative.module.js';
import { RoutingModule } from '../routing/routing.module.js';
import { RoadmapModule } from '../roadmap/roadmap.module.js';
import { REPORT_SOURCES } from './application/ports/report-sources.port.js';
import { GetDiagnosticReportUseCase } from './application/use-cases/get-diagnostic-report.use-case.js';
import { DownloadDiagnosticReportUseCase } from './application/use-cases/download-diagnostic-report.use-case.js';
import { REPORT_RENDERER } from './application/ports/report-renderer.port.js';
import { PdfkitReportRenderer } from './infrastructure/pdf/pdfkit-report.renderer.js';
import { ReportSourcesAdapter } from './infrastructure/report-sources.adapter.js';
import { ReportController } from './presentation/controllers/report.controller.js';

/**
 * `ReportingModule` — the full report of a diagnostic (RF-16).
 *
 * It owns no table: the report gathers what the other modules saved, read
 * through the queries they export (`REPORT_SOURCES`), and recalculates
 * nothing. The downloadable file is that report drawn by `REPORT_RENDERER`
 * (pdfkit). It imports the four modules only for those read queries.
 */
@Module({
  imports: [DiagnosisModule, InitiativeModule, RoutingModule, RoadmapModule],
  providers: [
    { provide: REPORT_SOURCES, useClass: ReportSourcesAdapter },
    applicationProvider(GetDiagnosticReportUseCase, [REPORT_SOURCES]),
    { provide: REPORT_RENDERER, useFactory: () => new PdfkitReportRenderer() },
    applicationProvider(DownloadDiagnosticReportUseCase, [
      GetDiagnosticReportUseCase,
      REPORT_RENDERER,
    ]),
  ],
  controllers: [ReportController],
})
export class ReportingModule {}
