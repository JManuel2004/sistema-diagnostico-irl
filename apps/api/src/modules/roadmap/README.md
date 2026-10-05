# roadmap

## Scope
Computes the scaling roadmap: which dimensions to raise, in which order, up to which level and in how many phases, from the maturity profile and the dependency graph between dimensions, so the route ends with no imbalance with an alert; and, for each phase, the INNLAB service that could be contracted, asked to `routing/`. **Does not cover** the profile (`diagnosis/`), nor how a service is chosen (`routing/`).

## Rules that must hold
- The dependency graph is not versioned: there is no active-edge flag (`dimension_dependency.is_active` was removed: no one could operate it).
- The roadmap is a **stored result with its date**, like the profile and the recommendation: it is computed and saved when the user accepts the deep analysis (`DeepAnalysisRequestedEvent`), and `GET` only reads it; before the acceptance it answers `409 ROADMAP_NOT_GENERATED`. A diagnostic has a single roadmap: computing again replaces it.
- **The route ends balanced** ([ADR 0016](../../../../../docs/architecture/decisions/0016-route-by-phases-with-services.md)): after the targets of the minimums and the dependencies (`RoadmapClosureService`, `TargetLevelCalculatorService`), `RoadmapBalancingService` raises the lower dimension of every pair farther apart than `roadmap_parameters.balance_tolerance` (1: no moderate or critical imbalance), never lowers one, and pulls in the enablers the new targets need. A dimension that only rises for that enters with `inclusionReason: BALANCE`.
- **A phase raises a dimension by at most `roadmap_parameters.max_levels_per_phase`** (`PhasePlannerService`): a dimension is worked once its enablers inside the roadmap reached their final target, and a larger rise continues in the next phases. Each appearance of a dimension starts where the previous one left it (`currentLevel`, `targetLevel` of the phase, `finalTargetLevel` of the route); `ScalingRoadmap` checks it. Without a limit the phases are exactly the topological layers of the roadmap (`TopologicalLayeringService`, kept as the reference the property tests compare against).
- **Each phase proposes a service** through `PhaseServiceAdvisorPort`, an adapter over the read-only queries `routing/` exports: the first phase opens with the portfolio recommendation; each next one asks for the service that best works its dimensions on the profile projected to its start, never of a lighter tier than the previous phase's and never one already proposed. The phase stores a copy of the service (id, name, tier, whether it is approximate) and the trace of how it was chosen; the service's card is read live when the roadmap is served. Without a routing configuration the phases are kept with no service.
- The order can be challenged: each dimension states what it unlocks, why it is in the plan (`inclusionReason`: below its minimum, enabler of another, or balance) and what sets its final target (`targetReason` and `targetDrivenBy`: its expected minimum, the dimension that demands it, or the paired dimension it keeps up with).
- It reads the taxonomy only through `shared/irl-taxonomy`'s port, never its ORM entities, and the portfolio only through `routing/`'s exported queries.
- It reacts to `DeepAnalysisRequestedEvent` independently of `routing/`'s listener (it evaluates the configuration, not the saved recommendation); a `Result.err` is logged and not propagated.

## Completeness
Implemented: transitive closure, targets with their explanation, balance, phases paced by the limit per phase, a service per phase with its trace, the AgroConecta case, and persistence of the result (`scaling_roadmap`: `phases` as `jsonb` typed `RoadmapPhase[]` with dimension codes and each phase's service snapshot and trace; `final_levels` and `balanced`). `GenerateScalingRoadmapUseCase` computes and saves; the listener runs it and publishes `ScalingRoadmapCalculatedEvent` only after a successful computation, never on a `GET`. `GET diagnostics/:id/roadmap` verifies the diagnostic belongs to the caller (`DiagnosticOwnershipPort`) and answers someone else's as missing (404). The parameters of the route, the graph and the minimums are simulated pending INNLAB.

## Responsibility (ubiquitous language)
"Where to scale from": the ordered path of improvements that suits the initiative given its profile, and the service of INNLAB that could accompany each step.

## Domain concepts
`ScalingRoadmap` (aggregate), `DependencyGraph`, `RoadmapParameters`; services `RoadmapClosureService`, `TargetLevelCalculatorService` (including `demandedBy`), `RoadmapBalancingService`, `PhasePlannerService`, `TopologicalLayeringService` (reference order).

## What it exposes
- **Exported read query:** `GetScalingRoadmapUseCase`, consumed by `reporting/` for the full report.
- **Events it publishes:** `ScalingRoadmapCalculatedEvent` (`shared/kernel/events/`); `diagnosis/` hears it to complete the deep analysis.
- **Events it listens to:** `DeepAnalysisRequestedEvent`.
- **HTTP:** `GET diagnostics/:id/roadmap` (reads the stored roadmap). Contract in Swagger (`/api/docs`). Each dimension is named with the catalog's `name` and `shortName`, and each phase's service carries its card from the portfolio catalog, its tier's tagline and description included (`GetScalingRoadmapUseCase`); the frontend keeps no names of its own. `finalLevels` and `balanced` describe the end of the route: the interface compares them with the profile of today (the global level, each dimension, each pair) and classifies nothing on its own.

## What it depends on
`diagnosis/` through its exported `GetMaturityProfileUseCase` and `FindDiagnosisOwnerQuery` (behind `DiagnosticOwnershipPort`); `routing/` through its exported `EvaluatePhaseServiceQuery` and `GetServiceDetailsQuery` (behind `PhaseServiceAdvisorPort`); `shared/irl-taxonomy` through `TAXONOMY_REPOSITORY`; `shared/kernel` for `EVENT_PUBLISHER`.

## Data it owns
Writes `irl_diagnostic.scaling_roadmap` (one row per diagnostic). Owns (seed only) `irl_catalog.dimension_dependency` and `irl_catalog.roadmap_parameters`. The text of each level, shown with the targets, belongs to `shared/irl-taxonomy` and travels in the profile (`levelScale`).

## Test coverage
- **Unit:** domain (graph, closure, layers, levels and `demandedBy`, property tests), balance and phases (`route-balance-and-phases.spec.ts`: the AgroConecta route on the seeded graph, and properties — it never lowers a dimension, ends within the tolerance, never raises more than the limit per phase, and without a limit equals the topological layers), the aggregate's invariants for a dimension spanning phases, AgroConecta acceptance, use cases (compute with a scripted portfolio and save; read the stored one with each service's card, `ROADMAP_NOT_GENERATED`), listener.
- **Integration:** `roadmap-graph-seed`, `roadmap-repository` (what is read is what was saved, replacement, cascade delete), `seed` (the route's parameters).
- **E2E:** `roadmap` (404 for another user's diagnostic, 409 before accepting, the balanced phases, the explanation and the service of each phase in the HTTP response, date stable between reads), `deep-analysis-events`, and `generate-recommendation` (AgroConecta's route of services).
