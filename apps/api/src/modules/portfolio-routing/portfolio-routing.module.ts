import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VersionConfiguracionOrm } from './infrastructure/persistence/version-configuracion.orm-entity.js';
import { SnapshotCalibracionOrm } from './infrastructure/persistence/snapshot-calibracion.orm-entity.js';
import { ValorEtiquetaCalibracionOrm } from './infrastructure/persistence/valor-etiqueta-calibracion.orm-entity.js';
import { SnapshotParametrosOrm } from './infrastructure/persistence/snapshot-parametros.orm-entity.js';
import { FichaOrdinalPublicadaOrm } from './infrastructure/persistence/ficha-ordinal-publicada.orm-entity.js';
import { IntensidadOrdinalPublicadaOrm } from './infrastructure/persistence/intensidad-ordinal-publicada.orm-entity.js';
import { ReglaElegibilidadPublicadaOrm } from './infrastructure/persistence/regla-elegibilidad-publicada.orm-entity.js';
import { ReglaExcepcionPublicadaOrm } from './infrastructure/persistence/regla-excepcion-publicada.orm-entity.js';
import { ServicioPortafolioOrm } from './infrastructure/persistence/servicio-portafolio.orm-entity.js';
import { RecomendacionPortafolioOrm } from './infrastructure/persistence/recomendacion-portafolio.orm-entity.js';
import { AlternativaRecomendacionOrm } from './infrastructure/persistence/alternativa-recomendacion.orm-entity.js';
import { TrazaCapasOrm } from './infrastructure/persistence/traza-capas.orm-entity.js';
import { DimensionOrm } from '../irl-catalog/infrastructure/persistence/entities/dimension.orm-entity.js';
import { IniciativaOrm } from '../initiative/infrastructure/persistence/iniciativa.orm-entity.js';
import { EtapaIniciativaOrm } from '../initiative/infrastructure/persistence/etapa-iniciativa.orm-entity.js';
import { SectorOrm } from '../initiative/infrastructure/persistence/sector.orm-entity.js';
import { TypeOrmActiveConfigurationRepository } from './infrastructure/persistence/typeorm-active-configuration.repository.js';
import { TypeOrmRecomendacionRepository } from './infrastructure/persistence/typeorm-recomendacion.repository.js';
import { TypeOrmInitiativeCharacterizationRepository } from './infrastructure/persistence/typeorm-initiative-characterization.repository.js';
import { ACTIVE_CONFIGURATION_REPOSITORY } from './domain/ports/active-configuration.repository.port.js';
import { RECOMENDACION_REPOSITORY } from './domain/ports/recomendacion.repository.port.js';
import { INITIATIVE_CHARACTERIZATION_READER } from './domain/ports/initiative-characterization.port.js';
import { OrdinalTranslatorService } from './domain/services/ordinal-translator.service.js';
import { EligibilityFilterService } from './domain/services/eligibility-filter.service.js';
import { AffinityScorerService } from './domain/services/affinity-scorer.service.js';
import { ExceptionEngineService } from './domain/services/exception-engine.service.js';
import { GenerateRecommendationUseCase } from './application/generate-recommendation.use-case.js';
import { GetRecommendationUseCase } from './application/get-recommendation.use-case.js';
import { GetRecommendationTraceUseCase } from './application/get-recommendation-trace.use-case.js';
import { RecomendacionController } from './interfaces/http/recomendacion.controller.js';
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
      VersionConfiguracionOrm,
      SnapshotCalibracionOrm,
      ValorEtiquetaCalibracionOrm,
      SnapshotParametrosOrm,
      FichaOrdinalPublicadaOrm,
      IntensidadOrdinalPublicadaOrm,
      ReglaElegibilidadPublicadaOrm,
      ReglaExcepcionPublicadaOrm,
      ServicioPortafolioOrm,
      RecomendacionPortafolioOrm,
      AlternativaRecomendacionOrm,
      TrazaCapasOrm,
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
    { provide: RECOMENDACION_REPOSITORY, useClass: TypeOrmRecomendacionRepository },
    {
      provide: INITIATIVE_CHARACTERIZATION_READER,
      useClass: TypeOrmInitiativeCharacterizationRepository,
    },
  ],
  controllers: [RecomendacionController],
  exports: [ACTIVE_CONFIGURATION_REPOSITORY, RECOMENDACION_REPOSITORY],
})
export class PortfolioRoutingModule {}
