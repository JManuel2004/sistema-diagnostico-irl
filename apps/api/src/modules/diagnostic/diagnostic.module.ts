import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiagnosticoOrm } from './infrastructure/persistence/diagnostico.orm-entity.js';
import { TypeOrmDiagnosticRepository } from './infrastructure/persistence/typeorm-diagnostic.repository.js';
import { DIAGNOSTIC_REPOSITORY } from './domain/ports/diagnostic.repository.port.js';
import { DiagnosticController } from './interfaces/http/diagnostic.controller.js';
import { QuestionnaireModule } from '../questionnaire/questionnaire.module.js';
import { IrlCatalogModule } from '../irl-catalog/irl-catalog.module.js';

/**
 * `DiagnosticModule` — bounded context for the `Diagnostico` aggregate
 * and the orchestrator that drives the diagnostic state machine.
 *
 * The orchestration use cases (`StartDiagnosticUseCase`,
 * `AdvanceToQuestionnaireUseCase`, `FinalizeInitialDiagnosticUseCase`,
 * etc.) live in `application/use-cases/` and arrive with their HU.
 * They will be added here as providers. The orchestrator will compose
 * the `QuestionnaireModule`'s `ANSWER_SHEET_REPOSITORY` and the future
 * `MaturityProfileModule`'s services to drive a diagnostic forward.
 *
 * The diagnostic repository symbol is exported so the orchestrator
 * (this module's own use cases) and any future cross-module read
 * (e.g. an analytics service) can resolve it.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DiagnosticoOrm]),
    QuestionnaireModule,
    IrlCatalogModule,
  ],
  providers: [
    { provide: DIAGNOSTIC_REPOSITORY, useClass: TypeOrmDiagnosticRepository },
  ],
  controllers: [DiagnosticController],
  exports: [DIAGNOSTIC_REPOSITORY],
})
export class DiagnosticModule {}
