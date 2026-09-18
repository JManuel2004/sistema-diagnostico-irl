import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DimensionResultOrm } from './infrastructure/persistence/dimension-result.orm-entity.js';
import { ImbalanceAnalysisOrm } from './infrastructure/persistence/imbalance-analysis.orm-entity.js';
import { TypeOrmMaturityProfileRepository } from './infrastructure/persistence/typeorm-maturity-profile.repository.js';
import { TypeOrmImbalanceRepository } from './infrastructure/persistence/typeorm-imbalance.repository.js';
import { MATURITY_PROFILE_REPOSITORY } from './domain/ports/maturity-profile.repository.port.js';
import { IMBALANCE_REPOSITORY } from './domain/ports/imbalance.repository.port.js';
import { IrlCalculatorService } from './domain/services/irl-calculator.service.js';
import { ImbalanceEvaluatorService } from './domain/services/imbalance-evaluator.service.js';
import { ComputeMaturityProfileUseCase } from './usecase/compute-maturity-profile.use-case.js';
import { GetMaturityProfileUseCase } from './usecase/get-maturity-profile.use-case.js';
import { MaturityProfileController } from './application/http/maturity-profile.controller.js';
import { IrlCatalogModule } from '../irl-catalog/irl-catalog.module.js';
import { DimensionOrm } from '../../shared/irl-taxonomy/infrastructure/database/orm-entities/dimension.orm-entity.js';
import { DimensionPairOrm } from '../../shared/irl-taxonomy/infrastructure/database/orm-entities/dimension-pair.orm-entity.js';

/**
 * `MaturityProfileModule` — bounded context for the IRL maturity profile.
 *
 * Owns the computation of dimensional IRL levels from the submitted answer
 * sheet (RF-07), the bottleneck detector (RF-08, DIAGIRL-35), the
 * dimensional imbalance evaluator (RF-10, DIAGIRL-38), and the
 * persistence of `dimension_result` and `imbalance_analysis` rows
 * in the `irl_diagnostic` schema.
 *
 * Wiring policy:
 *   - The repository binding is exported under the symbol
 *     `MATURITY_PROFILE_REPOSITORY` so the diagnostic orchestrator and
 *     any future read-only consumer can resolve it without reaching
 *     into infrastructure details.
 *   - `IrlCatalogModule` is imported so the use case can inject
 *     `IRL_CATALOG_REPOSITORY` via DI.
 *   - `DimensionOrm` is registered alongside the local
 *     `DimensionResultOrm` because the repository needs to translate
 *     between dimension code and integer FK against `irl_catalog`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DimensionResultOrm,
      ImbalanceAnalysisOrm,
      DimensionOrm,
      DimensionPairOrm,
    ]),
    IrlCatalogModule,
  ],
  providers: [
    IrlCalculatorService,
    ImbalanceEvaluatorService,
    ComputeMaturityProfileUseCase,
    GetMaturityProfileUseCase,
    {
      provide: MATURITY_PROFILE_REPOSITORY,
      useClass: TypeOrmMaturityProfileRepository,
    },
    {
      provide: IMBALANCE_REPOSITORY,
      useClass: TypeOrmImbalanceRepository,
    },
  ],
  controllers: [MaturityProfileController],
  exports: [
    MATURITY_PROFILE_REPOSITORY,
    ComputeMaturityProfileUseCase,
    // Consumido por PortfolioRoutingModule: el motor de enrutamiento lee
    // el perfil por su caso de uso de lectura, nunca alcanzando las tablas
    // de este módulo.
    GetMaturityProfileUseCase,
  ],
})
export class MaturityProfileModule {}
