# 0008 — The deep analysis completes when both of its results are saved

**Status:** accepted — extends [0002](./0002-domain-events-between-modules.md): the two "calculated" events now have a listener.

## Context

Accepting the deep analysis moved a diagnostic to `DEEP_ANALYSIS_IN_PROGRESS`, and nothing ever moved it to `DEEP_ANALYSIS_COMPLETE`, although the recommendation and the roadmap were saved moments later. `diagnosis` cannot ask `routing` or `roadmap` whether they finished: both import `diagnosis`, and a call back would be a cycle and a Core-to-Core process dependency ([0001](./0001-modular-monolith-bounded-contexts.md)).

## Decision

- `diagnosis` listens to `PortfolioRecommendationCalculatedEvent` and `ScalingRoadmapCalculatedEvent` and records on the diagnostic when each arrived (`recommendation_calculated_at`, `roadmap_calculated_at`).
- The rule lives in the aggregate (`Diagnosis.recordDeepAnalysisResult`): with both dates, a diagnostic `DEEP_ANALYSIS_IN_PROGRESS` becomes `DEEP_ANALYSIS_COMPLETE`. Recording a result again (a retried calculation) only refreshes its date.
- The two listeners run at the same time, so the change goes through `DiagnosisRepositoryPort.modify`, which loads, changes and saves the diagnostic inside a transaction holding a row lock: neither write can overwrite the other, and whichever comes second sees both dates.

## Consequences

- `deepAnalysisAccepted` and `completed` do not change (both already covered the complete state); the frontend is unaffected.
- A calculation that fails leaves the diagnostic in progress, and repeating `POST deep-analysis` retries it, as before.
- A future `reporting` module can listen to the same two events, or to the completed state, without a saga.
