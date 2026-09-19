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
 * `RoutingModule` — contexto acotado del enrutamiento al portafolio
 * INNLAB (RF-15). Incluye el catálogo de los seis servicios
 * (`service-catalog`, replegado aquí — ver convenciones-objetivo.md §1.1),
 * no es un módulo aparte.
 *
 * Sin versionado: el esquema de versionado de configuración se retiró
 * (backlog 5.6) porque nada en el sistema puede publicar una segunda
 * versión. El motor lee una única configuración vigente sin historial —
 * `ActiveConfigurationRepositoryPort.load()`.
 *
 * Los cuatro servicios de dominio son puros y sin decoradores: Nest los
 * registra como providers de clase porque no reciben nada en el
 * constructor, igual que `IrlCalculatorService`.
 *
 * Importa `DiagnosisModule` para leer el perfil por su caso de uso de
 * lectura, `InitiativeModule` para la caracterización, e
 * `IrlTaxonomyModule` para las dimensiones — ninguno de los tres se
 * alcanza por su entidad ORM directamente.
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
  exports: [ACTIVE_CONFIGURATION_REPOSITORY, RECOMMENDATION_REPOSITORY],
})
export class RoutingModule {}
