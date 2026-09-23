import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalibrationLabelValueOrm } from './infrastructure/database/orm-entities/calibration-label-value.orm-entity.js';
import { ScoringParametersOrm } from './infrastructure/database/orm-entities/scoring-parameters.orm-entity.js';
import { PublishedOrdinalProfileOrm } from './infrastructure/database/orm-entities/published-ordinal-profile.orm-entity.js';
import { PublishedOrdinalIntensityOrm } from './infrastructure/database/orm-entities/published-ordinal-intensity.orm-entity.js';
import { PublishedEligibilityRuleOrm } from './infrastructure/database/orm-entities/published-eligibility-rule.orm-entity.js';
import { PublishedExceptionRuleOrm } from './infrastructure/database/orm-entities/published-exception-rule.orm-entity.js';
import { PortfolioServiceOrm } from './infrastructure/database/orm-entities/portfolio-service.orm-entity.js';
import { PortfolioRecommendationOrm } from './infrastructure/database/orm-entities/portfolio-recommendation.orm-entity.js';
import { RecommendationAlternativeOrm } from './infrastructure/database/orm-entities/recommendation-alternative.orm-entity.js';
import { LayerTraceOrm } from './infrastructure/database/orm-entities/layer-trace.orm-entity.js';
import { IrlTaxonomyModule } from '../../shared/irl-taxonomy/irl-taxonomy.module.js';
import { TypeOrmActiveConfigurationRepository } from './infrastructure/database/repositories/typeorm-active-configuration.repository.js';
import { TypeOrmRecommendationRepository } from './infrastructure/database/repositories/typeorm-recommendation.repository.js';
import { InitiativeCharacterizationAdapter } from './infrastructure/initiative-characterization.adapter.js';
import { DeepAnalysisRequestedListener } from './infrastructure/messaging/deep-analysis-requested.listener.js';
import { ACTIVE_CONFIGURATION_REPOSITORY } from './domain/repositories/active-configuration.repository.port.js';
import { RECOMMENDATION_REPOSITORY } from './domain/repositories/recommendation.repository.port.js';
import { INITIATIVE_CHARACTERIZATION_READER } from './domain/repositories/initiative-characterization.port.js';
import { OrdinalTranslatorService } from './domain/services/ordinal-translator.service.js';
import { EligibilityFilterService } from './domain/services/eligibility-filter.service.js';
import { AffinityScorerService } from './domain/services/affinity-scorer.service.js';
import { ExceptionEngineService } from './domain/services/exception-engine.service.js';
import { GenerateRecommendationUseCase } from './application/use-cases/generate-recommendation.use-case.js';
import { GetRecommendationUseCase } from './application/use-cases/get-recommendation.use-case.js';
import { GetRecommendationTraceUseCase } from './application/use-cases/get-recommendation-trace.use-case.js';
import { RecommendationController } from './presentation/controllers/recommendation.controller.js';
import { DiagnosisModule } from '../diagnosis/diagnosis.module.js';
import { InitiativeModule } from '../initiative/initiative.module.js';

/**
 * `RoutingModule` — bounded context of the routing to the INNLAB portfolio
 * (RF-15). It includes the catalog of the six services (`service-catalog`,
 * folded in here because `routing/` is its only consumer); it is not a
 * module of its own.
 *
 * Not versioned: the configuration versioning scheme was retired because
 * nothing in the system can publish a second version. The engine reads a
 * single live configuration with no history —
 * `ActiveConfigurationRepositoryPort.load()`.
 *
 * The four domain services are pure and undecorated: Nest registers them
 * as class providers because they take nothing in the constructor, just
 * like `IrlCalculatorService`.
 *
 * Imports `DiagnosisModule` to read the profile through its read use case,
 * `InitiativeModule` for the characterization, and `IrlTaxonomyModule` for
 * the dimensions — none of the three is reached through its ORM entity.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CalibrationLabelValueOrm,
      ScoringParametersOrm,
      PublishedOrdinalProfileOrm,
      PublishedOrdinalIntensityOrm,
      PublishedEligibilityRuleOrm,
      PublishedExceptionRuleOrm,
      PortfolioServiceOrm,
      PortfolioRecommendationOrm,
      RecommendationAlternativeOrm,
      LayerTraceOrm,
    ]),
    IrlTaxonomyModule,
    DiagnosisModule,
    InitiativeModule,
  ],
  providers: [
    OrdinalTranslatorService,
    EligibilityFilterService,
    AffinityScorerService,
    ExceptionEngineService,
    GenerateRecommendationUseCase,
    GetRecommendationUseCase,
    GetRecommendationTraceUseCase,
    DeepAnalysisRequestedListener,
    {
      provide: ACTIVE_CONFIGURATION_REPOSITORY,
      useClass: TypeOrmActiveConfigurationRepository,
    },
    { provide: RECOMMENDATION_REPOSITORY, useClass: TypeOrmRecommendationRepository },
    {
      provide: INITIATIVE_CHARACTERIZATION_READER,
      useClass: InitiativeCharacterizationAdapter,
    },
  ],
  controllers: [RecommendationController],
})
export class RoutingModule {}
