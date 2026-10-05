# 0016 — The roadmap is a balanced route by phases, with a service per phase

**Status:** accepted — extends [0014](./0014-adjustment-only-services.md); keeps [0002](./0002-domain-events-between-modules.md).

## Context

INNLAB asked to merge the recommendation and the roadmap. The recommendation stays as it is and is shown first. Each phase of the roadmap shows, besides the level each dimension has to reach, the service that could be contracted next, going from the lightest service to the deepest. The route must also end **balanced**: by the end, no pair of dimensions may be left with an imbalance with an alert. The portfolio classifies its services in four tiers (Descubre, Co-crea, Profundiza, Alíate).

Re-running the recommendation on the profile projected to each phase was evaluated and discarded. Its score measures the need of the whole profile, so it drops as the profile improves: for AgroConecta the second phase already ended in «sin recomendación». It also answers «what suits this whole profile», not «which service raises these dimensions».

## Decision

- **Tier.** `service_tier` (code, name, order, tagline, description) and `portfolio_service.id_tier`, seeded verbatim from the portfolio. Each service also stores its `subtitle` and its `scope` («Alcance y entregables»). The tier does not change the recommendation; only the route uses it.
- **Balance.** After the targets of the minimums and the dependencies, the lower dimension of every pair farther apart than `roadmap_parameters.balance_tolerance` rises to `higher − tolerance`. No dimension is lowered, and the enablers the new targets need are pulled in. Tolerance 1 is the default: no moderate or critical imbalance at the end. A dimension that only rises for this enters with `BALANCE`. Each final target says what sets it (`targetReason`: expected minimum, a dependent, or the paired dimension).
- **Phases.** A phase works every dimension whose enablers inside the roadmap reached their final target, at most `roadmap_parameters.max_levels_per_phase` levels each (2 by default). A larger rise continues in the next phases. Without the limit, the phases are the topological layers, as before.
- **A service per phase.**
  - The first phase opens with the portfolio recommendation.
  - Each next one gets the service that best works its dimensions, on the profile projected to its start (the targets of the previous phases reached): `coverage weight × intensity × levels raised`, plus the stage, minus the band against the projected average.
  - The tier is a mandatory order: never lighter than the previous phase's service. A service is never repeated.
  - Adjustment-only services enter only through an `INCLUDE` that holds on the projected profile. Exclusions and adjustments apply as in the recommendation.
  - If no service reaches `phase_minimum_threshold`, the best one is shown marked as approximate.
- **What the response carries for the interface.** Each service's card includes its tier with the portfolio's tagline and description, so the interface says what «Nivel: Descubre» means instead of a generic sentence. The roadmap returns `finalLevels` and `balanced`, so the interface compares the end of the route with today's profile (the global level, each dimension and each pair) without classifying anything itself.
- **Orchestration.** `routing/` exports two read-only queries: `EvaluatePhaseServiceQuery` and `GetServiceDetailsQuery`. `roadmap/` reaches them behind its own `PhaseServiceAdvisorPort` and stores, per phase, a copy of the service and the trace of how it was chosen. The events do not change: both modules still react to `DeepAnalysisRequestedEvent` on their own, and `diagnosis/` still waits for their two «calculated» events.

## Consequences

- The route depends on the content more than on the code. With the current simulated intensities, no service works Propiedad Intelectual or Financiación well, and the tier order narrows the choice: once the recommendation opens the route with a deep tier, the next phases can only take services of that tier or deeper. For AgroConecta the route opens with Célula de Grado · Posgrado (Profundiza), and its second and third phases show an approximate service. That changes when INNLAB delivers its intensities.
- The roadmap can get longer: a balanced route with a limit per phase has more phases than the old one (AgroConecta goes from two to three).
- `roadmap/` now depends on `routing/`, but only through exported read queries, never its tables or domain.
- The recommendation shown first and the first phase's service are the same by construction.
