import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultadoDimensionOrm } from './infrastructure/persistence/resultado-dimension.orm-entity.js';
import { TypeOrmMaturityProfileRepository } from './infrastructure/persistence/typeorm-maturity-profile.repository.js';
import { MATURITY_PROFILE_REPOSITORY } from './domain/ports/maturity-profile.repository.port.js';
import { IrlCalculatorService } from './domain/services/irl-calculator.service.js';
import { ComputeMaturityProfileUseCase } from './application/compute-maturity-profile.use-case.js';
import { MaturityProfileController } from './interfaces/http/maturity-profile.controller.js';
import { QuestionnaireModule } from '../questionnaire/questionnaire.module.js';
import { IrlCatalogModule } from '../irl-catalog/irl-catalog.module.js';
import { DimensionOrm } from '../irl-catalog/infrastructure/persistence/entities/dimension.orm-entity.js';

/**
 * `MaturityProfileModule` — bounded context for the IRL maturity profile.
 *
 * Owns the computation of dimensional IRL levels from the submitted answer
 * sheet (RF-07), the bottleneck detector (RF-08, DIAGIRL-35), the
 * dimensional imbalance evaluator (RF-10, DIAGIRL-38), and the
 * persistence of `resultado_dimension` and `analisis_desequilibrio` rows
 * in the `irl_diagnostic` schema.
 *
 * Wiring policy:
 *   - The repository binding is exported under the symbol
 *     `MATURITY_PROFILE_REPOSITORY` so the diagnostic orchestrator and
 *     any future read-only consumer can resolve it without reaching
 *     into infrastructure details.
 *   - `QuestionnaireModule` and `IrlCatalogModule` are imported so the
 *     use case can inject `ANSWER_SHEET_REPOSITORY` and
 *     `IRL_CATALOG_REPOSITORY` via DI — both ports are exported by
 *     their respective modules.
 *   - `DimensionOrm` is registered alongside the local
 *     `ResultadoDimensionOrm` because the repository needs to translate
 *     between dimension code and integer FK against `irl_catalog`.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ResultadoDimensionOrm, DimensionOrm]),
    QuestionnaireModule,
    IrlCatalogModule,
  ],
  providers: [
    IrlCalculatorService,
    ComputeMaturityProfileUseCase,
    {
      provide: MATURITY_PROFILE_REPOSITORY,
      useClass: TypeOrmMaturityProfileRepository,
    },
  ],
  controllers: [MaturityProfileController],
  exports: [MATURITY_PROFILE_REPOSITORY],
})
export class MaturityProfileModule {}
