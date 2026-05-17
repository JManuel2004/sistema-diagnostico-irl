import { Module } from '@nestjs/common';

/**
 * `MaturityProfileModule` — bounded context for the IRL maturity profile.
 *
 * Owns the computation of dimensional IRL levels from the submitted answer
 * sheet (RF-07), the bottleneck detector (RF-08), the dimensional imbalance
 * evaluator (RF-10), and the persistence of `resultado_dimension` and
 * `analisis_desequilibrio` rows in the `irl_diagnostic` schema.
 *
 * Stage 1 status: **empty walking-skeleton**. No domain code, no use cases,
 * no controllers, no repository — only the module placeholder so the bounded
 * context is reserved and visible to the team.
 *
 * Use cases (`ComputeMaturityProfileUseCase`, `GetMaturityProfileUseCase`),
 * domain services (`IrlCalculatorService`, `BottleneckDetectorService`,
 * `ImbalanceEvaluatorService`), the `MaturityProfile` aggregate and its
 * value objects, the repository port + TypeORM adapter, the controller and
 * its DTOs all arrive with **DIAGIRL-34** ("Obtener niveles IRL por
 * dimensión") and the subsequent stories that consume it.
 *
 * Intentionally NOT registered in `ApiV1Module` yet — the module has zero
 * runtime effect until its first use case ships.
 *
 * For the full design see `docs/MODULES.md` → `maturity-profile`.
 */
@Module({})
export class MaturityProfileModule {}
