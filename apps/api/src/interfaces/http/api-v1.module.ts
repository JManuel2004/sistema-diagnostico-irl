import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller.js';
import { IrlCatalogModule } from '../../modules/irl-catalog/irl-catalog.module.js';
import { QuestionnaireModule } from '../../modules/questionnaire/questionnaire.module.js';
import { DiagnosticModule } from '../../modules/diagnostic/diagnostic.module.js';

/**
 * Composition root for the v1 HTTP surface.
 *
 * Each NestJS module published here corresponds to a bounded context.
 * Versioning is performed by mounting this module under `/api/v1` (set
 * via `app.setGlobalPrefix('api/v1')` in `main.ts`).
 *
 * Modules communicate by ID only — the orchestrator (Diagnostic) is the
 * only module that composes other modules. See `CLAUDE.md`.
 */
@Module({
  imports: [
    TerminusModule,
    IrlCatalogModule,
    QuestionnaireModule,
    DiagnosticModule,
  ],
  controllers: [HealthController],
})
export class ApiV1Module {}
