import { Module } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { applicationProvider } from '../../shared/kernel/infrastructure/nest/application-provider.js';
import { appConfig } from '../../config/configuration.js';
import { DiagnosisModule } from '../diagnosis/diagnosis.module.js';
import { FindDiagnosisOwnerQuery } from '../diagnosis/application/use-cases/find-diagnosis-owner.query.js';
import { InitiativeModule } from '../initiative/initiative.module.js';
import { RoutingModule } from '../routing/routing.module.js';
import { RoadmapModule } from '../roadmap/roadmap.module.js';
import { REPORT_SOURCES } from './application/ports/report-sources.port.js';
import { REPORT_MAILER } from './application/ports/report-mailer.port.js';
import { REPORT_NOTIFICATION } from './application/report-notification.js';
import { GetDiagnosticReportUseCase } from './application/use-cases/get-diagnostic-report.use-case.js';
import { DownloadDiagnosticReportUseCase } from './application/use-cases/download-diagnostic-report.use-case.js';
import { NotifyInnlabOfCompletedReportUseCase } from './application/use-cases/notify-innlab-of-completed-report.use-case.js';
import { REPORT_RENDERER } from './application/ports/report-renderer.port.js';
import { PdfkitReportRenderer } from './infrastructure/pdf/pdfkit-report.renderer.js';
import { NodemailerReportMailer } from './infrastructure/mail/nodemailer-report-mailer.js';
import { DeepAnalysisCompletedListener } from './infrastructure/messaging/deep-analysis-completed.listener.js';
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
    {
      provide: REPORT_NOTIFICATION,
      useFactory: (cfg: ConfigType<typeof appConfig>) => ({
        enabled: cfg.mail.enabled,
        to: cfg.mail.to,
        from: cfg.mail.from,
      }),
      inject: [appConfig.KEY],
    },
    {
      provide: REPORT_MAILER,
      useFactory: (cfg: ConfigType<typeof appConfig>) =>
        new NodemailerReportMailer({
          host: cfg.mail.host,
          port: cfg.mail.port,
          user: cfg.mail.user,
          password: cfg.mail.password,
          from: cfg.mail.from,
        }),
      inject: [appConfig.KEY],
    },
    applicationProvider(NotifyInnlabOfCompletedReportUseCase, [
      FindDiagnosisOwnerQuery,
      DownloadDiagnosticReportUseCase,
      REPORT_MAILER,
      REPORT_NOTIFICATION,
    ]),
    DeepAnalysisCompletedListener,
  ],
  controllers: [ReportController],
})
export class ReportingModule {}
