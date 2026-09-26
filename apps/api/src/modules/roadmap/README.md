# roadmap

## Scope
Computes the scaling roadmap: which dimensions to raise, in which order and up to which level, from the maturity profile and the dependency graph between dimensions. **Does not cover** the profile (`diagnosis/`) or the portfolio recommendation (`routing/`).

## Rules that must hold
- The dependency graph is not versioned: there is no active-edge flag (`dimension_dependency.is_active` was removed: no one could operate it).
- The roadmap is a **stored result with its date**, like the profile and the recommendation: it is computed and saved when the user accepts the deep analysis (`DeepAnalysisRequestedEvent`), and `GET` only reads it; before the acceptance it answers `409 ROADMAP_NOT_GENERATED`. A diagnostic has a single roadmap: computing again replaces it.
- The computation is a pure function of the profile and the graph; only the result is stored.
- The order can be challenged: each dimension states what it unlocks, why it is in the plan (`inclusionReason`: below its minimum, or enabler of another) and what sets its target (`targetDrivenBy`: the dimension that demands it, or `null` when the target is its expected minimum).
- It reads the taxonomy only through `shared/irl-taxonomy`'s port, never its ORM entities.
- It reacts to `DeepAnalysisRequestedEvent` independently of `routing/`; a `Result.err` is logged and not propagated.

## Completeness
Implemented: transitive closure, topological layers, target level per dimension with its explanation, the AgroConecta case, and persistence of the result (`scaling_roadmap`, `jsonb` typed as `RoadmapPhase[]` with the phases as dimension codes; names are read from the catalog). `GenerateScalingRoadmapUseCase` computes and saves; the listener runs it and publishes `ScalingRoadmapCalculatedEvent` only after a successful computation, never on a `GET`. `GET diagnostics/:id/roadmap` verifies the diagnostic belongs to the caller (`DiagnosticOwnershipPort`) and answers someone else's as missing (404).

## Responsibility (ubiquitous language)
"Where to scale from": the ordered path of improvements that suits the initiative given its profile.

## Domain concepts
`ScalingRoadmap` (aggregate), `DependencyGraph`; services `RoadmapClosureService`, `TopologicalLayeringService`, `TargetLevelCalculatorService` (including `demandedBy`, which names the dimension that sets a target).

## What it exposes
- **Events it publishes:** `ScalingRoadmapCalculatedEvent` (`shared/kernel/events/`); `diagnosis/` hears it to complete the deep analysis.
- **Events it listens to:** `DeepAnalysisRequestedEvent`.
- **HTTP:** `GET diagnostics/:id/roadmap` (reads the stored roadmap). Contract in Swagger (`/api/docs`). Each dimension is named with the catalog's `name` and `shortName` (`GetScalingRoadmapUseCase`); the frontend keeps no names of its own.

## What it depends on
`diagnosis/` through its exported `GetMaturityProfileUseCase` and `FindDiagnosisOwnerQuery` (behind `DiagnosticOwnershipPort`); `shared/irl-taxonomy` through `TAXONOMY_REPOSITORY`; `shared/kernel` for `EVENT_PUBLISHER`.

## Data it owns
Writes `irl_diagnostic.scaling_roadmap` (one row per diagnostic). Owns (seed only) `irl_catalog.dimension_dependency`. There are no orientation texts per dimension and level: they are an input INNLAB has not delivered.

## Test coverage
- **Unit:** domain (graph, closure, layers, levels and `demandedBy`, property tests), AgroConecta acceptance, use cases (compute and save; read the stored one, `ROADMAP_NOT_GENERATED`), listener.
- **Integration:** `roadmap-graph-seed`, `roadmap-repository` (what is read is what was saved, replacement, cascade delete).
- **E2E:** `roadmap` (404 for another user's diagnostic, 409 before accepting, explanation in the HTTP response, date stable between reads), `deep-analysis-events`.
