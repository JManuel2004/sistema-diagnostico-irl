import { Module } from '@nestjs/common';
import { applicationProvider } from '../../shared/kernel/infrastructure/nest/application-provider.js';
import { EVENT_PUBLISHER } from '../../shared/kernel/application/ports/event-publisher.port.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IrlTaxonomyModule } from '../../shared/irl-taxonomy/irl-taxonomy.module.js';
import { TAXONOMY_REPOSITORY } from '../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import type { TaxonomyRepositoryPort } from '../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';

import { DiagnosisOrm } from './infrastructure/database/orm-entities/diagnosis.orm-entity.js';
import { AnswerOrm } from './infrastructure/database/orm-entities/answer.orm-entity.js';
import { StatementOrm } from './infrastructure/database/orm-entities/statement.orm-entity.js';
import { DimensionResultOrm } from './infrastructure/database/orm-entities/dimension-result.orm-entity.js';
import { ImbalanceAnalysisOrm } from './infrastructure/database/orm-entities/imbalance-analysis.orm-entity.js';

import { TypeOrmDiagnosisRepository } from './infrastructure/database/repositories/typeorm-diagnosis.repository.js';
import { TypeOrmAnswerSheetRepository } from './infrastructure/database/repositories/typeorm-answer-sheet.repository.js';
import { TypeOrmStatementCatalogRepository } from './infrastructure/database/repositories/typeorm-statement-catalog.repository.js';
import { TypeOrmMaturityProfileRepository } from './infrastructure/database/repositories/typeorm-maturity-profile.repository.js';
import { TypeOrmImbalanceRepository } from './infrastructure/database/repositories/typeorm-imbalance.repository.js';

import { DIAGNOSIS_REPOSITORY } from './domain/repositories/diagnosis.repository.port.js';
import { ANSWER_SHEET_REPOSITORY } from './domain/repositories/answer-sheet.repository.port.js';
import { STATEMENT_CATALOG_REPOSITORY } from './domain/repositories/statement-catalog.port.js';
import type { StatementCatalogPort } from './domain/repositories/statement-catalog.port.js';
import { MATURITY_PROFILE_REPOSITORY } from './domain/repositories/maturity-profile.repository.port.js';
import { IMBALANCE_REPOSITORY } from './domain/repositories/imbalance.repository.port.js';

import { IrlCalculatorService } from './domain/services/irl-calculator.service.js';
import { ImbalanceEvaluatorService } from './domain/services/imbalance-evaluator.service.js';

import { FinalizeInitialDiagnosisUseCase } from './application/use-cases/finalize-initial-diagnosis.use-case.js';
import { SubmitQuestionnaireUseCase } from './application/use-cases/submit-questionnaire.use-case.js';
import { ComputeMaturityProfileUseCase } from './application/use-cases/compute-maturity-profile.use-case.js';
import { GetMaturityProfileUseCase } from './application/use-cases/get-maturity-profile.use-case.js';
import { GetOwnMaturityProfileUseCase } from './application/use-cases/get-own-maturity-profile.use-case.js';
import { FindDiagnosisOwnerQuery } from './application/use-cases/find-diagnosis-owner.query.js';
import { GetDiagnosisProgressQuery } from './application/use-cases/get-diagnosis-progress.query.js';
import { ListUserDiagnosesQuery } from './application/use-cases/list-user-diagnoses.query.js';
import { GetDiagnosisUseCase } from './application/use-cases/get-diagnosis.use-case.js';
import { ApplyInitiativeToDiagnosisUseCase } from './application/use-cases/apply-initiative-to-diagnosis.use-case.js';
import { InitiativeRegisteredListener } from './infrastructure/messaging/initiative-registered.listener.js';
import { RecordDeepAnalysisResultUseCase } from './application/use-cases/record-deep-analysis-result.use-case.js';
import { DeepAnalysisResultListener } from './infrastructure/messaging/deep-analysis-result.listener.js';
import { StartDiagnosisUseCase } from './application/use-cases/start-diagnosis.use-case.js';
import { RequestDeepAnalysisUseCase } from './application/use-cases/request-deep-analysis.use-case.js';
import { GetQuestionnaireStructureQuery } from './application/use-cases/get-questionnaire-structure.query.js';

import { DiagnosisController } from './presentation/controllers/diagnosis.controller.js';
import { QuestionnaireController } from './presentation/controllers/questionnaire.controller.js';
import { MaturityProfileController } from './presentation/controllers/maturity-profile.controller.js';
import { QuestionnaireCatalogController } from './presentation/controllers/questionnaire-catalog.controller.js';

/**
 * `DiagnosisModule` — Core bounded context for the questionnaire run and
 * the resulting maturity profile.
 *
 * Fuses the three modules that used to divide this single flow
 * (`diagnostic`, `questionnaire`, `maturity-profile`) — they already
 * depended on each other through the only real orchestrator in the
 * system, so splitting them into separate Nest modules never bought
 * isolation, only cross-module wiring for a flow that is one bounded
 * context. `consent` is not absorbed here: it lives in `initiative/`.
 *
 * `IrlTaxonomyModule` is imported for `TAXONOMY_REPOSITORY`: every read of
 * the dimensions, the pairs and the conversion table goes through that
 * port; no ORM entity of `shared/irl-taxonomy/` is registered here.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DiagnosisOrm,
      AnswerOrm,
      StatementOrm,
      DimensionResultOrm,
      ImbalanceAnalysisOrm,
    ]),
    IrlTaxonomyModule,
  ],
  providers: [
    applicationProvider(ListUserDiagnosesQuery, [
      DIAGNOSIS_REPOSITORY,
      MATURITY_PROFILE_REPOSITORY,
      TAXONOMY_REPOSITORY,
    ]),
    applicationProvider(FindDiagnosisOwnerQuery, [DIAGNOSIS_REPOSITORY]),
    applicationProvider(GetDiagnosisProgressQuery, [DIAGNOSIS_REPOSITORY]),
    { provide: DIAGNOSIS_REPOSITORY, useClass: TypeOrmDiagnosisRepository },
    {
      provide: ANSWER_SHEET_REPOSITORY,
      useClass: TypeOrmAnswerSheetRepository,
    },
    {
      provide: STATEMENT_CATALOG_REPOSITORY,
      useClass: TypeOrmStatementCatalogRepository,
    },
    {
      provide: MATURITY_PROFILE_REPOSITORY,
      useClass: TypeOrmMaturityProfileRepository,
    },
    { provide: IMBALANCE_REPOSITORY, useClass: TypeOrmImbalanceRepository },
    IrlCalculatorService,
    ImbalanceEvaluatorService,
    applicationProvider(FinalizeInitialDiagnosisUseCase, [
      DIAGNOSIS_REPOSITORY,
      ANSWER_SHEET_REPOSITORY,
      SubmitQuestionnaireUseCase,
      ComputeMaturityProfileUseCase,
      TAXONOMY_REPOSITORY,
    ]),
    applicationProvider(SubmitQuestionnaireUseCase, [
      ANSWER_SHEET_REPOSITORY,
      DIAGNOSIS_REPOSITORY,
      STATEMENT_CATALOG_REPOSITORY,
    ]),
    applicationProvider(ComputeMaturityProfileUseCase, [
      STATEMENT_CATALOG_REPOSITORY,
      TAXONOMY_REPOSITORY,
      MATURITY_PROFILE_REPOSITORY,
      IMBALANCE_REPOSITORY,
      IrlCalculatorService,
      ImbalanceEvaluatorService,
    ]),
    applicationProvider(GetMaturityProfileUseCase, [
      MATURITY_PROFILE_REPOSITORY,
      IMBALANCE_REPOSITORY,
      TAXONOMY_REPOSITORY,
      DIAGNOSIS_REPOSITORY,
    ]),
    applicationProvider(GetOwnMaturityProfileUseCase, [
      DIAGNOSIS_REPOSITORY,
      GetMaturityProfileUseCase,
    ]),
    applicationProvider(RequestDeepAnalysisUseCase, [
      DIAGNOSIS_REPOSITORY,
      EVENT_PUBLISHER,
    ]),
    applicationProvider(StartDiagnosisUseCase, [
      DIAGNOSIS_REPOSITORY,
      TAXONOMY_REPOSITORY,
    ]),
    applicationProvider(GetDiagnosisUseCase, [
      DIAGNOSIS_REPOSITORY,
      TAXONOMY_REPOSITORY,
    ]),
    applicationProvider(ApplyInitiativeToDiagnosisUseCase, [
      DIAGNOSIS_REPOSITORY,
    ]),
    InitiativeRegisteredListener,
    applicationProvider(RecordDeepAnalysisResultUseCase, [
      DIAGNOSIS_REPOSITORY,
    ]),
    DeepAnalysisResultListener,
    {
      provide: GetQuestionnaireStructureQuery,
      useFactory: (
        taxonomy: TaxonomyRepositoryPort,
        statementCatalog: StatementCatalogPort,
      ) => new GetQuestionnaireStructureQuery(taxonomy, statementCatalog),
      inject: [TAXONOMY_REPOSITORY, STATEMENT_CATALOG_REPOSITORY],
    },
  ],
  controllers: [
    DiagnosisController,
    QuestionnaireController,
    MaturityProfileController,
    QuestionnaireCatalogController,
  ],
  exports: [
    // Consumed by InitiativeModule, RoutingModule and RoadmapModule: the
    // ownership check of every per-diagnostic endpoint.
    FindDiagnosisOwnerQuery,
    // Consumed by InitiativeModule: the initiative profile is frozen once
    // the deep analysis is accepted.
    GetDiagnosisProgressQuery,
    // Consumed by InitiativeModule: the history of a user's diagnostics,
    // as summaries.
    ListUserDiagnosesQuery,
    // Consumed by RoutingModule/RoadmapModule: the recommendation and
    // roadmap engines read the profile through this read use case, never
    // reaching the tables directly.
    GetMaturityProfileUseCase,
  ],
})
export class DiagnosisModule {}
