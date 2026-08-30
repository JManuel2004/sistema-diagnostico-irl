import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiagnosticoOrm } from './infrastructure/persistence/diagnostico.orm-entity.js';
import { TypeOrmDiagnosticRepository } from './infrastructure/persistence/typeorm-diagnostic.repository.js';
import { DIAGNOSTIC_REPOSITORY } from './domain/ports/diagnostic.repository.port.js';
import { DiagnosticController } from './interfaces/http/diagnostic.controller.js';
import { FinalizeInitialDiagnosticUseCase } from './application/finalize-initial-diagnostic.use-case.js';
import { QuestionnaireModule } from '../questionnaire/questionnaire.module.js';
import { MaturityProfileModule } from '../maturity-profile/maturity-profile.module.js';

/**
 * `DiagnosticModule` — bounded context for the `Diagnostico` aggregate
 * and the orchestrator that drives the diagnostic state machine.
 *
 * Cross-module composition lives here: this module is the only one
 * allowed to call questionnaire + maturity-profile use cases together.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DiagnosticoOrm]),
    QuestionnaireModule,
    MaturityProfileModule,
  ],
  providers: [
    { provide: DIAGNOSTIC_REPOSITORY, useClass: TypeOrmDiagnosticRepository },
    FinalizeInitialDiagnosticUseCase,
  ],
  controllers: [DiagnosticController],
  exports: [DIAGNOSTIC_REPOSITORY],
})
export class DiagnosticModule {}
