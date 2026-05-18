# `diagnostic` module

Bounded context for the **diagnostic process manager / orchestrator**.
Owns the `Diagnostico` aggregate root that other modules reference by id.
This module is the only one allowed to compose the others — see root
`CLAUDE.md` ("modules communicate by id only; the Diagnostic module is
the orchestrator").

## Stage 1 — what exists

- `diagnostic.module.ts` — empty `@Module({})` registered into `ApiV1Module`.
- The `diagnostico` table is created by the initial migration with the
  `estado` CHECK constraint listing the full state machine even though
  most transitions are not yet implemented.

## Stage 2 — what arrives within the three target stories

**None.** The three target stories (HU-07, HU-08, HU-09) do not require
any diagnostic state transition or use case. The table is created
proactively only because the `respuesta` foreign key needs it — schema
completeness is cheaper than schema churn (IMPLEMENTATION.md §4.8).

## Deferred (the entire diagnostic process — out of scope for the three target stories)

Files that the architecture documents but that Stage 1 does **not** create:

| Layer             | File                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain/`         | `Diagnostico` aggregate, `DiagnosticState` VO, `DiagnosticRepositoryPort`                                                                               |
| `application/`    | `StartDiagnosticUseCase`, `AdvanceToQuestionnaireUseCase`, `FinalizeInitialDiagnosticUseCase`, `ListMyDiagnosticsUseCase`, `GetDiagnosticDetailUseCase` |
| `infrastructure/` | `DiagnosticoOrm`, `TypeOrmDiagnosticRepository`                                                                                                         |
| `interfaces/`     | `DiagnosticController`                                                                                                                                  |

These will arrive with the corresponding HU-xx in subsequent phases
(notably HU-03, HU-04, HU-11 onward).
