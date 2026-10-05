import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './shared/kernel/presentation/controllers/health.controller.js';
import { IdentityModule } from './shared/identity/identity.module.js';
import { DiagnosisModule } from './modules/diagnosis/diagnosis.module.js';
import { InitiativeModule } from './modules/initiative/initiative.module.js';
import { RoutingModule } from './modules/routing/routing.module.js';
import { RoadmapModule } from './modules/roadmap/roadmap.module.js';
import { ReportingModule } from './modules/reporting/reporting.module.js';

/**
 * Composition root for the HTTP surface.
 *
 * Each NestJS module published here corresponds to a bounded context.
 * Every route is mounted under the single global prefix set via
 * `app.setGlobalPrefix('api/v1')` in `main.ts`; no module declares its
 * own version or prefix.
 *
 * Modules communicate by ID only — the orchestrator (`DiagnosisModule`)
 * is the only module that composes other modules.
 */
@Module({
  imports: [
    TerminusModule,
    IdentityModule,
    DiagnosisModule,
    InitiativeModule,
    RoutingModule,
    RoadmapModule,
    ReportingModule,
  ],
  controllers: [HealthController],
})
export class ApiModule {}
