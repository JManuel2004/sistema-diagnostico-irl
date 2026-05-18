# `maturity-profile` module

Bounded context for the IRL maturity profile of a single diagnostic — owns
the calculation of dimensional IRL levels from the 48 submitted answers, the
bottleneck detector, the imbalance evaluator, and the persistence of the
results in the `irl_diagnostic` schema.

**SRS coverage:** RF-07 (compute IRL level by dimension), RF-08 (bottleneck),
RF-09 (radar input), RF-10 (dimensional imbalance).

**Phase 1 priority:** highest. The IRL calculator is the core intellectual
property of the project and is exhaustively property-tested.

## Stage 1 — what exists

- `maturity-profile.module.ts` — empty `@Module({})`, intentionally NOT
  imported by `ApiV1Module`. Zero runtime effect until its first use case
  ships.
- This README and the four empty layer folders. Nothing else.

## Stage 2 — what arrives with HU-34 ("Obtener niveles IRL por dimensión")

| Layer             | Files                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `domain/`         | `MaturityProfile` aggregate; `DimensionResult`, `Bottleneck`, `ImbalancePair` VOs              |
|                   | `IrlCalculatorService` (pure, no IO), `BottleneckDetectorService`, `ImbalanceEvaluatorService` |
|                   | `MaturityProfileRepositoryPort`                                                                |
| `application/`    | `ComputeMaturityProfileUseCase`, `GetMaturityProfileUseCase`                                   |
| `infrastructure/` | `ResultadoDimensionOrm`, `AnalisisDesequilibrioOrm`, `TypeOrmMaturityProfileRepository`        |
| `interfaces/`     | `MaturityProfileController` — `GET /api/v1/diagnosticos/:id/perfil`                            |

When HU-34 lands, also register `MaturityProfileModule` in
`interfaces/http/api-v1.module.ts` and wire it into the `DiagnosticModule`
orchestrator's `FinalizeInitialDiagnosticUseCase`.

## Reusable groundwork already in the repo (do NOT re-create)

- `LikertValue` value object — `shared-kernel/domain/value-objects/likert-value.vo.ts`
- `IrlLevel` value object (1..9 invariant) — `shared-kernel/domain/value-objects/irl-level.vo.ts`
- `DimensionCode` value object — `shared-kernel/domain/value-objects/dimension-code.ts`
- `ConversionRange` domain entity + `findAllConversionRanges()` port method —
  `modules/irl-catalog/`
- `DomainError` hierarchy + `Result<T, E>` — `shared-kernel/`

## Reference material

- Conversion table (Anexo A, KTH IRL Cuestionario Guía v1.0, 2025) — defines
  the Likert-average → IRL-level mapping in 9 ranges. **Source of truth for
  `IrlCalculatorService`.** Already seeded into `irl_catalog.rango_conversion`
  by `seeds/data/` (rows pending).
- KTH Innovation Readiness Level™ framework — licensed CC BY-NC-SA 4.0;
  attribution mandatory in any output that displays the levels (RNF-09).
- `docs/MODULES.md` — full design walkthrough.

## Testing focus (when implemented)

- **Property-based tests with `fast-check`** for `IrlCalculatorService` over
  the full Likert input space. Highest-ROI test in the project.
- Boundary tests on the conversion table: `1.00`, `1.39`, `1.40`, `2.19`,
  `2.20`, `4.39`, `4.40`, `5.00`.
- Tie cases for `BottleneckDetectorService`: 1 minimum, 2 tied, 3 tied, all
  6 equal.
- All classifications for `ImbalanceEvaluatorService` across the six pairs.
- Coverage threshold for `modules/maturity-profile/domain/`: **95%**
  (already declared in `jest.config.js`).
