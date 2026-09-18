import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IrlTaxonomyModule } from '../../shared/irl-taxonomy/irl-taxonomy.module.js';
import { TAXONOMY_REPOSITORY } from '../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import type { TaxonomyRepositoryPort } from '../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import { DimensionOrm } from '../../shared/irl-taxonomy/infrastructure/database/orm-entities/dimension.orm-entity.js';
import { DimensionPairOrm } from '../../shared/irl-taxonomy/infrastructure/database/orm-entities/dimension-pair.orm-entity.js';

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
import { GetQuestionnaireStructureQuery } from './application/use-cases/get-questionnaire-structure.query.js';

import { DiagnosisController } from './presentation/controllers/diagnosis.controller.js';
import { QuestionnaireController } from './presentation/controllers/questionnaire.controller.js';
import { MaturityProfileController } from './presentation/controllers/maturity-profile.controller.js';
import { QuestionnaireCatalogController } from './presentation/controllers/questionnaire-catalog.controller.js';

/**
 * `DiagnosisModule` — Core bounded context for the questionnaire run and
 * the resulting maturity profile (`convenciones-objetivo.md` §1.1).
 *
 * Fuses the three modules that used to divide this single flow
 * (`diagnostic`, `questionnaire`, `maturity-profile`) — they already
 * depended on each other through the only real orchestrator in the
 * system, so splitting them into separate Nest modules never bought
 * isolation, only cross-module wiring for a flow that is one bounded
 * context. `consent` is not absorbed here: it moves to `initiative/`
 * (Oleada 3), not into `diagnosis/`.
 *
 * `IrlTaxonomyModule` is imported so `GetQuestionnaireStructureQuery`
 * can read dimensions through `TAXONOMY_REPOSITORY`; `DimensionOrm` and
 * `DimensionPairOrm` are also registered directly here because
 * `TypeOrmMaturityProfileRepository`/`TypeOrmImbalanceRepository` still
 * read them without going through the port — the same pre-existing
 * "acceso cruzado a DimensionOrm" deuda documented in backlog 1.3/3.2,
 * carried over unchanged from the modules this one absorbs. Correcting
 * it is Oleadas 4/5's job for `routing/`/`roadmap/`; the two repositories
 * that live in this module were not in scope for that fix either.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DiagnosisOrm,
      AnswerOrm,
      StatementOrm,
      DimensionResultOrm,
      ImbalanceAnalysisOrm,
      DimensionOrm,
      DimensionPairOrm,
    ]),
    IrlTaxonomyModule,
  ],
  providers: [
    { provide: DIAGNOSIS_REPOSITORY, useClass: TypeOrmDiagnosisRepository },
    { provide: ANSWER_SHEET_REPOSITORY, useClass: TypeOrmAnswerSheetRepository },
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
    FinalizeInitialDiagnosisUseCase,
    SubmitQuestionnaireUseCase,
    ComputeMaturityProfileUseCase,
    GetMaturityProfileUseCase,
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
    DIAGNOSIS_REPOSITORY,
    ANSWER_SHEET_REPOSITORY,
    MATURITY_PROFILE_REPOSITORY,
    ComputeMaturityProfileUseCase,
    // Consumed by RoutingModule/RoadmapModule (routing/
    // scaling-roadmap until Oleadas 4/5 rename them): the recommendation
    // and roadmap engines read the profile through this read use case,
    // never reaching the tables directly.
    GetMaturityProfileUseCase,
  ],
})
export class DiagnosisModule {}
