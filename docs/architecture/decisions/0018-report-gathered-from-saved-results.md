# 0018 — The full report is gathered from the saved results, in a module of its own

**Status:** accepted — builds on [0001](./0001-modular-monolith-bounded-contexts.md) (the `reporting` module it foresaw) and [0008](./0008-deep-analysis-completes-from-its-results.md); keeps [0009](./0009-data-model-condensed.md).

## Context

RF-16 asks for a full report of the diagnostic: the initiative, the six dimensions, gaps, alerts, the roadmap and the INNLAB recommendation, with the attribution of the KTH framework. HU-23 shows it on screen before downloading; HU-24 downloads it as a PDF; HU-25 will attach that PDF to an email to INNLAB. Every piece already exists, saved by the module that owns it, and each has its own endpoint. What was missing is one place that decides when the report exists and puts the pieces together, the same for the screen, the file and the email.

Composing it in the frontend from the four endpoints was discarded: the PDF of HU-24 and the email of HU-25 are produced by the server, so the composition must live there too, or the screen and the file could drift.

Storing a snapshot of the report was discarded: the results it gathers do not change once saved (the inputs freeze with the deep analysis), so a copy would only duplicate them and add the tables [0009](./0009-data-model-condensed.md) removed for lack of a reader.

## Decision

- **A `reporting` module, with no table.** `GET diagnostics/:id/report` gathers, on every read, what `diagnosis/`, `initiative/`, `routing/` and `roadmap/` saved, through read queries they export (`GetDiagnosisUseCase`, `GetMaturityProfileUseCase`, `GetInitiativeProfileUseCase`, `GetRecommendationUseCase`, `GetScalingRoadmapUseCase`) behind its own `ReportSourcesPort`. It recalculates nothing: each section is exactly the response of its own endpoint.
- **The report exists once the deep analysis is complete.** The diagnostic exposes `deepAnalysisCompleted` (`DEEP_ANALYSIS_COMPLETE`, both results saved), derived by the backend like `completed` and `deepAnalysisAccepted`. Before that the report answers `409 REPORT_NOT_AVAILABLE` and the interface offers no report.
- **One attribution.** `IRL_ATTRIBUTION` in `@innlab/contracts` carries the framework, its owner and the CC BY-NC-SA 4.0 license; the report includes it, so the screen and the file cannot reword or drop it (RNF-09).

## Consequences

- The report says what the results page says, by construction.
- The PDF (HU-24) and the email (HU-25) are renderings of the same `DiagnosticReport`; they add no reads of their own.
- `reporting/` depends on four modules, but only through read queries; none of them knows it exists, and it listens to no event.
- Five read queries are now exported. Each already checked ownership for its own endpoint, so the report inherits the check.
