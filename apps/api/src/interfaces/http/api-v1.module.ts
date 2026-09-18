import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';
import { IdentityModule } from '../../shared/identity/identity.module.js';
import { DiagnosisModule } from '../../modules/diagnosis/diagnosis.module.js';
import { InitiativeModule } from '../../modules/initiative/initiative.module.js';
import { RoutingModule } from '../../modules/routing/routing.module.js';
import { RoadmapModule } from '../../modules/roadmap/roadmap.module.js';

/**
 * Composition root for the v1 HTTP surface.
 *
 * Each NestJS module published here corresponds to a bounded context.
 * Versioning is performed by mounting this module under `/api/v1` (set
 * via `app.setGlobalPrefix('api/v1')` in `main.ts`).
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
  ],
  controllers: [HealthController],
})
export class ApiV1Module {}
