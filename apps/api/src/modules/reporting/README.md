# reporting

## Scope
The full report of a diagnostic (RF-16), on screen and as a downloadable PDF, and the mail of that PDF to INNLAB when the deep analysis completes (HU-25): its initiative, what the user answered to each of the 48 statements, its maturity profile with the gaps, the imbalanced pairs and the dimensions in critical state, the INNLAB recommendation with its justification, and the roadmap by phases, under the attribution of the KTH framework. **Does not cover** computing any of those results (`diagnosis/`, `routing/`, `roadmap/`).

## Rules that must hold
- **The report exists only once the deep analysis is complete** (`deepAnalysisCompleted`: both results saved, [ADR 0008](../../../../../docs/architecture/decisions/0008-deep-analysis-completes-from-its-results.md)). Before that `GetDiagnosticReportUseCase` answers `ReportNotAvailableError` (`REPORT_NOT_AVAILABLE`, 409) without reading any result.
- **It gathers, never recalculates** ([ADR 0018](../../../../../docs/architecture/decisions/0018-report-gathered-from-saved-results.md)): each section is what the owning module already serves on its own endpoint, read through the query it exports. The report says exactly what the results page says.
- **It owns no table.** Nothing is snapshotted: the report is gathered on every read, from results that do not change once saved.
- **Only the caller's diagnostic** (RNF-04): the diagnostic is read first through `GetDiagnosisUseCase`, which answers someone else's as missing (404); every other read also checks ownership.
- **The attribution travels with the report** (RNF-09): `IRL_ATTRIBUTION` from `@innlab/contracts` (KTH Innovation, CC BY-NC-SA 4.0), the single source for the screen and the file.
- A section missing from a complete diagnostic is propagated as its own error; a partial report is never served.
- **The PDF is the same report, drawn** (HU-24): `DownloadDiagnosticReportUseCase` reads it through `GetDiagnosticReportUseCase` (same rules: 404, 409), `buildReportDocument` decides what the file says — Spanish, no dimension codes, every level with its meaning, the order of the screen — and `REPORT_RENDERER` (`PdfkitReportRenderer`) only lays those blocks out. Nothing is drawn before the report exists.
- **The file has charts, not only text**: the profile as a radar of the six levels, the route as each dimension today and at its end on the 1–9 scale, and the 48 answers as five segments filled up to the value. Every mark carries the dimension's name and its number in text ink: the dimension tones of the brand do not separate TRL from CRL and the FRL yellow barely shows on white, so colour is never the only signal (the yellow gets an outline).
- **The file carries the attribution on every page** (RNF-09): the `IRL_ATTRIBUTION` notice and the page number at the foot of each page, and a closing section with the framework, its version and the CC BY-NC-SA 4.0 license link.
- **The file holds only the caller's diagnostic**: it is built from that one report, and named after its initiative and the day the analysis finished (`reporte-irl-<initiative>-<yyyy-mm-dd>.pdf`, `reportFileName`).
- **INNLAB is mailed that same PDF when the deep analysis has just completed** (HU-25). `diagnosis/` publishes `DeepAnalysisCompletedEvent` only on the transition to `DEEP_ANALYSIS_COMPLETE`. `NotifyInnlabOfCompletedReportUseCase` reads the owner's report through `DownloadDiagnosticReportUseCase` and `REPORT_MAILER` sends it to `REPORT_NOTIFY_TO`. Phase 1 never publishes the event, so declining or skipping the deep analysis sends nothing. A mail failure is logged by the listener and is not awaited, so the leader's request is not failed and the report stays on `GET diagnostics/:id/report`. No destination or no SMTP host disables the mail (`mail.enabled` false) without changing that screen.
- The PDF is drawn with Helvetica, one of the fonts every PDF reader carries: Plus Jakarta Sans is not shipped with the backend, and the brand manual names Arial (its metric twin) for documents generated outside the product. Brand colours from `DESIGN.md` (Azul Icesi headings, `#333333` text, critical red for the alerts).

## Completeness
Implemented: `GET diagnostics/:id/report` (HU-23), `GET diagnostics/:id/report/pdf` (HU-24) and the mail of that PDF to INNLAB when the deep analysis completes (HU-25).

## Responsibility (ubiquitous language)
"The report of the diagnostic": the formal output of the process, the one the initiative leader reviews, keeps or shares.

## Domain concepts
None of its own: the report is a read model. `ReportNotAvailableError` is its only domain type; `ReportDocumentModel` (`application/dtos/report-document.ts`) is the content of the file, block by block.

## What it exposes
- **HTTP:** `GET diagnostics/:id/report` (`DiagnosticReport` in `@innlab/contracts`) and `GET diagnostics/:id/report/pdf` (`application/pdf`, `Content-Disposition: attachment`). Contracts in Swagger (`/api/docs`).
- No events, no exported queries.

## What it depends on
`pdfkit` (only in `infrastructure/pdf/`; banned in `domain/` and `application/` by `eslint.config.mjs`). Through `ReportSourcesPort` (`ReportSourcesAdapter`), the read queries exported by: `diagnosis/` (`GetDiagnosisUseCase`, `GetDiagnosisAnswersQuery`, `GetMaturityProfileUseCase`), `initiative/` (`GetInitiativeProfileUseCase`), `routing/` (`GetRecommendationUseCase`) and `roadmap/` (`GetScalingRoadmapUseCase`). Never their repositories or ORM entities.

## Data it owns
None.

## Test coverage
- **Unit:** `GetDiagnosticReportUseCase` (the report parses as the contract, the attribution, the completion date, 409 before completion without reading any result, 404 for someone else's diagnostic, a missing section is propagated); `buildReportDocument` and `reportFileName` (order of the sections, attribution and license, no dimension codes, most severe pair first, only the diagnostic's own data, the file name); `DownloadDiagnosticReportUseCase` (draws nothing on 409 or 404); `PdfkitReportRenderer` (a complete PDF with metadata, the attribution at the foot of every page); `NotifyInnlabOfCompletedReportUseCase` (mails the PDF when the report exists, sends nothing when mail is off, when there is no owner, or before the deep analysis).
- **E2E:** `reporting/report` (409 before the deep analysis for the report and the PDF, the PDF downloaded as an attachment named after the initiative, the AgroConecta report after it, the same recommendation and roadmap as their own endpoints, 404 for another user's diagnostic).
