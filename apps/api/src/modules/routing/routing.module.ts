import { Module } from '@nestjs/common';
import { GetMaturityProfileUseCase } from '../diagnosis/application/use-cases/get-maturity-profile.use-case.js';
import { applicationProvider } from '../../shared/kernel/infrastructure/nest/application-provider.js';
import { EVENT_PUBLISHER } from '../../shared/kernel/application/ports/event-publisher.port.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalibrationLabelValueOrm } from './infrastructure/database/orm-entities/calibration-label-value.orm-entity.js';
import { ScoringParametersOrm } from './infrastructure/database/orm-entities/scoring-parameters.orm-entity.js';
import { PortfolioServiceStageOrm } from './infrastructure/database/orm-entities/portfolio-service-stage.orm-entity.js';
import { OrdinalIntensityOrm } from './infrastructure/database/orm-entities/ordinal-intensity.orm-entity.js';
import { EligibilityRuleOrm } from './infrastructure/database/orm-entities/eligibility-rule.orm-entity.js';
import { ExceptionRuleOrm } from './infrastructure/database/orm-entities/exception-rule.orm-entity.js';
import { PortfolioServiceOrm } from './infrastructure/database/orm-entities/portfolio-service.orm-entity.js';
import { PortfolioRecommendationOrm } from './infrastructure/database/orm-entities/portfolio-recommendation.orm-entity.js';
import { RecommendationRankOrm } from './infrastructure/database/orm-entities/recommendation-rank.orm-entity.js';
import { IrlTaxonomyModule } from '../../shared/irl-taxonomy/irl-taxonomy.module.js';
import { TypeOrmRoutingConfigurationRepository } from './infrastructure/database/repositories/typeorm-routing-configuration.repository.js';
import { TypeOrmRecommendationRepository } from './infrastructure/database/repositories/typeorm-recommendation.repository.js';
import { InitiativeCharacterizationAdapter } from './infrastructure/initiative-characterization.adapter.js';
import { DeepAnalysisRequestedListener } from './infrastructure/messaging/deep-analysis-requested.listener.js';
import { ROUTING_CONFIGURATION_REPOSITORY } from './domain/repositories/routing-configuration.repository.port.js';
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
import { DIAGNOSTIC_OWNERSHIP } from './domain/repositories/diagnostic-ownership.port.js';
import { DiagnosisOwnershipAdapter } from './infrastructure/diagnosis-ownership.adapter.js';
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
 * `RoutingConfigurationRepositoryPort.load()`.
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
      PortfolioServiceStageOrm,
      OrdinalIntensityOrm,
      EligibilityRuleOrm,
      ExceptionRuleOrm,
      PortfolioServiceOrm,
      PortfolioRecommendationOrm,
      RecommendationRankOrm,
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
    applicationProvider(GenerateRecommendationUseCase, [ROUTING_CONFIGURATION_REPOSITORY, RECOMMENDATION_REPOSITORY, INITIATIVE_CHARACTERIZATION_READER, GetMaturityProfileUseCase, OrdinalTranslatorService, EligibilityFilterService, AffinityScorerService, ExceptionEngineService, EVENT_PUBLISHER]),
    applicationProvider(GetRecommendationUseCase, [RECOMMENDATION_REPOSITORY, DIAGNOSTIC_OWNERSHIP]),
    applicationProvider(GetRecommendationTraceUseCase, [RECOMMENDATION_REPOSITORY, DIAGNOSTIC_OWNERSHIP]),
    { provide: DIAGNOSTIC_OWNERSHIP, useClass: DiagnosisOwnershipAdapter },
    DeepAnalysisRequestedListener,
    {
      provide: ROUTING_CONFIGURATION_REPOSITORY,
      useClass: TypeOrmRoutingConfigurationRepository,
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
