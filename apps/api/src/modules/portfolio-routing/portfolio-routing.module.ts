import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigurationVersionOrm } from './infrastructure/persistence/configuration-version.orm-entity.js';
import { CalibrationSnapshotOrm } from './infrastructure/persistence/calibration-snapshot.orm-entity.js';
import { CalibrationLabelValueOrm } from './infrastructure/persistence/calibration-label-value.orm-entity.js';
import { ParametersSnapshotOrm } from './infrastructure/persistence/parameters-snapshot.orm-entity.js';
import { PublishedOrdinalProfileOrm } from './infrastructure/persistence/published-ordinal-profile.orm-entity.js';
import { PublishedOrdinalIntensityOrm } from './infrastructure/persistence/published-ordinal-intensity.orm-entity.js';
import { PublishedEligibilityRuleOrm } from './infrastructure/persistence/published-eligibility-rule.orm-entity.js';
import { PublishedExceptionRuleOrm } from './infrastructure/persistence/published-exception-rule.orm-entity.js';
import { PortfolioServiceOrm } from './infrastructure/persistence/portfolio-service.orm-entity.js';
import { PortfolioRecommendationOrm } from './infrastructure/persistence/portfolio-recommendation.orm-entity.js';
import { RecommendationAlternativeOrm } from './infrastructure/persistence/recommendation-alternative.orm-entity.js';
import { LayerTraceOrm } from './infrastructure/persistence/layer-trace.orm-entity.js';
import { DimensionOrm } from '../irl-catalog/infrastructure/persistence/entities/dimension.orm-entity.js';
import { IniciativaOrm } from '../initiative/infrastructure/persistence/iniciativa.orm-entity.js';
import { EtapaIniciativaOrm } from '../initiative/infrastructure/persistence/etapa-iniciativa.orm-entity.js';
import { SectorOrm } from '../initiative/infrastructure/persistence/sector.orm-entity.js';
import { TypeOrmActiveConfigurationRepository } from './infrastructure/persistence/typeorm-active-configuration.repository.js';
import { TypeOrmRecommendationRepository } from './infrastructure/persistence/typeorm-recommendation.repository.js';
import { TypeOrmInitiativeCharacterizationRepository } from './infrastructure/persistence/typeorm-initiative-characterization.repository.js';
import { ACTIVE_CONFIGURATION_REPOSITORY } from './domain/ports/active-configuration.repository.port.js';
import { RECOMMENDATION_REPOSITORY } from './domain/ports/recommendation.repository.port.js';
import { INITIATIVE_CHARACTERIZATION_READER } from './domain/ports/initiative-characterization.port.js';
import { OrdinalTranslatorService } from './domain/services/ordinal-translator.service.js';
import { EligibilityFilterService } from './domain/services/eligibility-filter.service.js';
import { AffinityScorerService } from './domain/services/affinity-scorer.service.js';
import { ExceptionEngineService } from './domain/services/exception-engine.service.js';
import { GenerateRecommendationUseCase } from './usecase/generate-recommendation.use-case.js';
import { GetRecommendationUseCase } from './usecase/get-recommendation.use-case.js';
import { GetRecommendationTraceUseCase } from './usecase/get-recommendation-trace.use-case.js';
import { RecommendationController } from './application/http/recommendation.controller.js';
import { MaturityProfileModule } from '../maturity-profile/maturity-profile.module.js';

/**
 * `PortfolioRoutingModule` — contexto acotado del enrutamiento al
 * portafolio INNLAB (RF-15).
 *
 * Un solo módulo para los dos ciclos, configuración y uso, con la
 * separación sostenida por la partición de `application/`. La alternativa
 * —dos módulos Nest— obligaría a que el de configuración importase al de
 * uso para reutilizar los servicios de dominio del motor (el simulador
 * debe ejecutar exactamente el mismo motor que producción) y a la vez el
 * de uso importase al de configuración para leer la versión vigente, lo
 * que cierra un ciclo de dependencias.
 *
 * Los cuatro servicios de dominio son puros y sin decoradores: Nest los
 * registra como providers de clase porque no reciben nada en el
 * constructor, igual que `IrlCalculatorService`.
 *
 * Importa `MaturityProfileModule` para leer el perfil por su caso de uso
 * de lectura, nunca alcanzando sus tablas.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ConfigurationVersionOrm,
      CalibrationSnapshotOrm,
      CalibrationLabelValueOrm,
      ParametersSnapshotOrm,
      PublishedOrdinalProfileOrm,
      PublishedOrdinalIntensityOrm,
      PublishedEligibilityRuleOrm,
      PublishedExceptionRuleOrm,
      PortfolioServiceOrm,
      PortfolioRecommendationOrm,
      RecommendationAlternativeOrm,
      LayerTraceOrm,
      DimensionOrm,
      IniciativaOrm,
      EtapaIniciativaOrm,
      SectorOrm,
    ]),
    MaturityProfileModule,
  ],
  providers: [
    OrdinalTranslatorService,
    EligibilityFilterService,
    AffinityScorerService,
    ExceptionEngineService,
    GenerateRecommendationUseCase,
    GetRecommendationUseCase,
    GetRecommendationTraceUseCase,
    {
      provide: ACTIVE_CONFIGURATION_REPOSITORY,
      useClass: TypeOrmActiveConfigurationRepository,
    },
    { provide: RECOMMENDATION_REPOSITORY, useClass: TypeOrmRecommendationRepository },
    {
      provide: INITIATIVE_CHARACTERIZATION_READER,
      useClass: TypeOrmInitiativeCharacterizationRepository,
    },
  ],
  controllers: [RecommendationController],
  exports: [ACTIVE_CONFIGURATION_REPOSITORY, RECOMMENDATION_REPOSITORY],
})
export class PortfolioRoutingModule {}
