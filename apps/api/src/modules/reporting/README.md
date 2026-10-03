# reporting

## Scope
The full report of a diagnostic (RF-16): its initiative, its maturity profile with the gaps, the imbalanced pairs and the dimensions in critical state, the INNLAB recommendation with its justification, and the roadmap by phases, under the attribution of the KTH framework. **Does not cover** computing any of those results (`diagnosis/`, `routing/`, `roadmap/`), nor notifying INNLAB (HU-25, not built).

## Rules that must hold
- **The report exists only once the deep analysis is complete** (`deepAnalysisCompleted`: both results saved, [ADR 0008](../../../../../docs/architecture/decisions/0008-deep-analysis-completes-from-its-results.md)). Before that `GetDiagnosticReportUseCase` answers `ReportNotAvailableError` (`REPORT_NOT_AVAILABLE`, 409) without reading any result.
- **It gathers, never recalculates** ([ADR 0018](../../../../../docs/architecture/decisions/0018-report-gathered-from-saved-results.md)): each section is what the owning module already serves on its own endpoint, read through the query it exports. The report says exactly what the results page says.
- **It owns no table.** Nothing is snapshotted: the report is gathered on every read, from results that do not change once saved.
- **Only the caller's diagnostic** (RNF-04): the diagnostic is read first through `GetDiagnosisUseCase`, which answers someone else's as missing (404); every other read also checks ownership.
- **The attribution travels with the report** (RNF-09): `IRL_ATTRIBUTION` from `@innlab/contracts` (KTH Innovation, CC BY-NC-SA 4.0), the single source for the screen and the file.
- A section missing from a complete diagnostic is propagated as its own error; a partial report is never served.

## Completeness
Implemented: `GET diagnostics/:id/report` (HU-23). Pending: the downloadable file (HU-24) and the notification to INNLAB (HU-25).

## Responsibility (ubiquitous language)
"The report of the diagnostic": the formal output of the process, the one the initiative leader reviews, keeps or shares.

## Domain concepts
None of its own: the report is a read model. `ReportNotAvailableError` is its only domain type.

## What it exposes
- **HTTP:** `GET diagnostics/:id/report` (`DiagnosticReport` in `@innlab/contracts`). Contract in Swagger (`/api/docs`).
- No events, no exported queries.

## What it depends on
Through `ReportSourcesPort` (`ReportSourcesAdapter`), the read queries exported by: `diagnosis/` (`GetDiagnosisUseCase`, `GetMaturityProfileUseCase`), `initiative/` (`GetInitiativeProfileUseCase`), `routing/` (`GetRecommendationUseCase`) and `roadmap/` (`GetScalingRoadmapUseCase`). Never their repositories or ORM entities.

## Data it owns
None.

## Test coverage
- **Unit:** `GetDiagnosticReportUseCase` (the report parses as the contract, the attribution, the completion date, 409 before completion without reading any result, 404 for someone else's diagnostic, a missing section is propagated).
- **E2E:** `reporting/report` (409 before the deep analysis, the AgroConecta report after it, the same recommendation and roadmap as their own endpoints, 404 for another user's diagnostic).
